import "#./lib/sentry.ts";

import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { createNodeWebSocket } from "@hono/node-ws";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { UI_MESSAGE_STREAM_HEADERS } from "ai";
import { eq, sql } from "drizzle-orm";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";
import { logger } from "hono/logger";
import {
	appURL,
	captureError,
	getErrorMessage,
	getPreviousMonthDate,
} from "ielts-agents-internal-util";
import Stripe from "stripe";
import { z } from "zod";
import type { AgentId } from "#./lib/agent-id.ts";
import { agentIdSchema } from "#./lib/agent-id-schema.ts";
import { auth } from "#./lib/auth.tsx";
import { chatIdSchema } from "#./lib/chat-id-schema.ts";
import { createAgentStream } from "#./lib/create-agent-stream.ts";
import { database } from "#./lib/database.ts";
import { onStripeSubscriptionChangedEvent } from "#./lib/on-stripe-subscription-changed-event.ts";
import { resumableStreamContext } from "#./lib/resumable-stream-context.ts";
import { router } from "#./lib/router/index.ts";
import { chat, workspace } from "#./lib/schema/index.ts";
import { SpeakingWebSocketRelay } from "#./lib/speaking-websocket-relay.ts";
import { stripe } from "#./lib/stripe.ts";
import { syncWorkspace } from "#./lib/sync-workspace.ts";
import { syncWorkspaceColumns } from "#./lib/sync-workspace-columns.ts";
import type { SyncWorkspaceDetails } from "#./lib/sync-workspace-details.ts";

const hono = new Hono();

const nodeWebSocket = createNodeWebSocket({ app: hono });
const upgradeWebSocket = nodeWebSocket.upgradeWebSocket;
const injectWebSocket = nodeWebSocket.injectWebSocket.bind(nodeWebSocket);

hono.onError((e, c) => {
	if (e instanceof HTTPException) {
		if (e.status >= 500) captureError(e);
		return e.getResponse();
	}
	captureError(e);
	return c.text("Internal Server Error", 500);
});

hono.use(
	cors({
		origin: auth.options.trustedOrigins,
		credentials: true,
		exposeHeaders: ["content-type", "content-length", "cache-control"],
		allowHeaders: ["content-type", "content-length", "user-agent", "accept"],
		allowMethods: ["GET", "POST"],
		maxAge: 600,
	}),
);

const healthComponentSchema = z.enum(["database", "app", "website"]);

const healthComponentsSchema = z
	.string()
	.transform((v) => v.split(",").filter(Boolean))
	.pipe(z.array(healthComponentSchema))
	.refine((v) => new Set(v).size === v.length);

type HealthComponent = z.infer<typeof healthComponentSchema>;

hono.get("/v1/health", async (c) => {
	const parsed = healthComponentsSchema.safeParse(
		c.req.query("components") ?? "",
	);
	if (!parsed.success) throw new HTTPException(400);
	const requested: HealthComponent[] =
		parsed.data.length > 0 ? parsed.data : ["database"];
	const checked = Object.fromEntries(
		await Promise.all(
			requested.map(async (component) => {
				try {
					switch (component) {
						case "database": {
							await database.query.user.findFirst();
							break;
						}
						case "app": {
							const response = await fetch(appURL);
							if (!response.ok) throw new Error(`HTTP ${response.status}`);
							break;
						}
					}
					return [component, "ok"] as const;
				} catch (error) {
					return [component, getErrorMessage(error)] as const;
				}
			}),
		),
	);
	return c.json(
		checked,
		Object.values(checked).every((v) => v === "ok") ? 200 : 503,
	);
});

hono.use(logger());

const bearerPrefix = "Bearer ";

const automationMiddleware = createMiddleware(async (c, next) => {
	if (
		c.req.header("authorization") !==
		`${bearerPrefix}${process.env.AUTOMATION_SECRET}`
	)
		throw new HTTPException(401);
	return next();
});

hono.post("/v1/cron/daily", automationMiddleware, async (c) => {
	const previousMonthDate = getPreviousMonthDate();
	const workspaceDataShouldResetCredits =
		await database.query.workspace.findMany({
			where: (table, { sql }) =>
				sql`(${table.changedPlans}->0->>'time')::bigint < ${previousMonthDate.getTime()}`,
			columns: syncWorkspaceColumns,
		});
	if (workspaceDataShouldResetCredits.length > 0) {
		await Promise.all(
			workspaceDataShouldResetCredits.map((workspaceData) =>
				syncWorkspace({ workspaceData }),
			),
		);
	}
	return c.text("OK", 200);
});

hono.post("/v1/webhook/stripe", async (c) => {
	const signature = c.req.header("stripe-signature");
	if (!signature) throw new HTTPException(401);
	try {
		const event = stripe.webhooks.constructEvent(
			Buffer.from(await c.req.arrayBuffer()),
			signature,
			process.env.STRIPE_WEBHOOK_SECRET ?? "stripe-webhook-secret",
		);
		switch (event.type) {
			case "customer.subscription.created":
			case "customer.subscription.updated":
			case "customer.subscription.deleted": {
				await onStripeSubscriptionChangedEvent(event);
				break;
			}
			default: {
				break;
			}
		}
		return c.text("OK", 200);
	} catch (error) {
		if (error instanceof Stripe.errors.StripeSignatureVerificationError)
			throw new HTTPException(400);
		throw error;
	}
});

// Serve audio files for listening tests
hono.get(
	"/v1/audio/*",
	serveStatic({
		root: "./data",
		rewriteRequestPath: (path) => path.replace("/v1/audio", "/audio"),
	}),
);

hono.on(["GET", "POST"], "/v1/auth/*", (c) => auth.handler(c.req.raw));

hono.on(["GET", "POST"], "/v1/trpc/*", (c) =>
	fetchRequestHandler({
		router,
		endpoint: "/v1/trpc",
		req: c.req.raw,
		createContext: () => ({ hono: c }),
	}),
);

const aiMiddleware = createMiddleware<{
	Variables: typeof auth.$Infer.Session & {
		workspace: SyncWorkspaceDetails;
	};
}>(async (c, next) => {
	const authData = await auth.api.getSession({ headers: c.req.raw.headers });
	if (!authData) throw new HTTPException(401);
	const workspaceData = await syncWorkspace({ userId: authData.user.id });
	c.set("session", authData.session);
	c.set("user", authData.user);
	c.set("workspace", workspaceData);
	return next();
});

const chatBodySchema = z.object({
	messages: z.array(z.unknown()),
});

hono.post("/v1/ai/chat/:id/stream", aiMiddleware, async (c) => {
	const chatId = chatIdSchema.parse(c.req.param("id"));
	const { messages } = chatBodySchema.parse(await c.req.json());
	const workspace = c.get("workspace");
	const withColumns = { columns: { id: true, model: true } } as const;
	const withRelations = Object.fromEntries(
		agentIdSchema.options.map((agentName) => [agentName, withColumns]),
	) as Record<AgentId, typeof withColumns>;
	const chatData = await database.query.chat.findFirst({
		columns: withColumns.columns,
		with: withRelations,
		where: (table, { and, eq }) =>
			and(eq(table.workspaceId, workspace.id), eq(table.id, chatId)),
	});
	if (!chatData) throw new HTTPException(404, { message: "Chat not found" });
	const availableCredits = workspace.aggregatedCredits - workspace.usedCredits;
	if (availableCredits <= 0)
		throw new HTTPException(402, { message: "Insufficient credits" });
	for (const agentName of agentIdSchema.options) {
		const agentData = chatData[agentName] as { id: number } | undefined;
		if (agentData)
			return createAgentStream(agentName, chatId, messages, workspace.id);
	}
	throw new HTTPException(400, { message: "Chat has no associated agent" });
});

hono.get("/v1/ai/chat/:id/stream", aiMiddleware, async (c) => {
	const chatId = chatIdSchema.parse(c.req.param("id"));
	const chatData = await database.query.chat.findFirst({
		where: (table, { and, eq }) =>
			and(eq(table.workspaceId, c.get("workspace").id), eq(table.id, chatId)),
		columns: { streamId: true },
	});
	if (!chatData?.streamId) return new Response(null, { status: 204 });
	return new Response(
		// @ts-expect-error AI SDK docs recommend this pattern
		await resumableStreamContext.resumeExistingStream(chatData.streamId),
		{ headers: UI_MESSAGE_STREAM_HEADERS },
	);
});

hono.get(
	"/v1/ai/speaking/:id/ws",
	upgradeWebSocket(async (c) => {
		const authData = await auth.api.getSession({
			headers: c.req.raw.headers,
		});
		if (!authData) throw new HTTPException(401);
		const workspaceData = await syncWorkspace({ userId: authData.user.id });
		const chatId = chatIdSchema.parse(c.req.param("id"));
		const availableCredits =
			workspaceData.aggregatedCredits - workspaceData.usedCredits;
		if (availableCredits <= 0)
			throw new HTTPException(402, { message: "Insufficient credits" });
		const chatData = await database.query.chat.findFirst({
			where: (table, { and, eq }) =>
				and(eq(table.workspaceId, workspaceData.id), eq(table.id, chatId)),
			with: { speaking: true },
		});
		if (!chatData?.speaking)
			throw new HTTPException(404, { message: "Speaking chat not found" });
		const relay = new SpeakingWebSocketRelay({
			bandScore: chatData.speaking.bandScore,
			testPart: chatData.speaking.testPart,
			topic: chatData.speaking.topic,
			onTranscriptUpdate: () => {
				// Real-time transcript updates handled by relay
			},
			onSessionEnd: (data) => {
				console.log(
					`Speaking session ended for chat ${chatId}: ${data.transcript.length} entries, ${data.duration}s`,
				);
				// Deduct speaking session credits (10 credits)
				const sessionCredits = 10;
				void database.transaction(async (tx) => {
					await tx
						.update(chat)
						.set({
							usedCredits: sql`${chat.usedCredits} + ${sessionCredits}`,
						})
						.where(eq(chat.id, chatId));
					await tx
						.update(workspace)
						.set({
							usedCredits: sql`LEAST(${workspace.usedCredits} + ${sessionCredits}, ${workspace.aggregatedCredits})`,
						})
						.where(eq(workspace.id, workspaceData.id));
				});
			},
		});
		return {
			onOpen: (_event, ws) => {
				relay.connect(ws);
			},
			onMessage: (event) => {
				relay.handleClientMessage(String(event.data));
			},
			onClose: () => {
				relay.handleClientClose();
			},
		};
	}),
);

const server = serve(
	{ fetch: hono.fetch, port: Number(process.env.PORT ?? 42_310) },
	(addressInfo) => {
		console.log(`Listening 'http://localhost:${addressInfo.port}'`);
	},
);

injectWebSocket(server);
