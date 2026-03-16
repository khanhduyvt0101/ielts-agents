import bcrypt from "bcrypt";
import type { User } from "better-auth";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import {
	apiURL,
	appURL,
	isLive,
	trustedOrigins,
} from "ielts-agents-internal-util";

import { database } from "#./lib/database.ts";
import { EmailVerification, PasswordReset } from "#./lib/emails/index.ts";
import { getMonthlyCredits } from "#./lib/get-monthly-credits.ts";
import { redis } from "#./lib/redis.ts";
import { workspace } from "#./lib/schema/index.ts";
import { sendReactEmail } from "#./lib/send-react-email.ts";
import { stripe } from "#./lib/stripe.ts";

async function createWorkspace(user: User) {
	const workspaceData = await database.query.workspace.findFirst({
		where: (table, { eq }) => eq(table.userId, user.id),
		columns: { id: true },
	});
	if (workspaceData) return;
	const stripeCustomer = await stripe.customers.create(
		{
			name: user.name,
			email: user.email,
			metadata: {
				test_id: (isLive ? "" : (process.env.STRIPE_TEST_ID ?? "")) || null,
				user_id: user.id,
			},
		},
		{ idempotencyKey: `create_customer_for_user_${user.id}` },
	);
	const monthlyCredits = getMonthlyCredits("free");
	await database.insert(workspace).values({
		userId: user.id,
		stripeCustomerId: stripeCustomer.id,
		changedPlans: [{ key: "free", time: Date.now(), credits: monthlyCredits }],
		aggregatedCredits: monthlyCredits,
	});
}

export const auth = betterAuth({
	trustedOrigins,
	databaseHooks: {
		user: {
			create: {
				before: async () => {
					await Promise.resolve();
					if (!isLive) return { data: { emailVerified: true } };
				},
				after: async (user) => {
					if (!isLive || user.emailVerified) await createWorkspace(user);
				},
			},
		},
	},
	appName: "IELTS Agents",
	baseURL: apiURL,
	basePath: "/v1/auth",
	advanced: { cookiePrefix: "v1_auth" },
	database: drizzleAdapter(database, { provider: "pg" }),
	secondaryStorage: {
		get: (key) => redis.get(key),
		set: async (key, value, ttl) => {
			await (typeof ttl === "number"
				? redis.set(key, value, { expiration: { type: "EX", value: ttl } })
				: redis.set(key, value));
		},
		delete: async (key) => {
			await redis.del(key);
		},
	},
	rateLimit: { storage: "secondary-storage" },
	emailVerification: {
		sendVerificationEmail: async ({ user, url }) => {
			const verifyURL = new URL(url);
			const callbackURL = verifyURL.searchParams.get("callbackURL");
			if (!callbackURL || callbackURL === "/")
				verifyURL.searchParams.set("callbackURL", `${appURL}/auth-callback`);
			await sendReactEmail({
				subject: "Verify your email - IELTS Agents",
				element: <EmailVerification url={verifyURL.toString()} />,
				to: user.email,
			});
		},
		afterEmailVerification: async (user) => {
			if (isLive) await createWorkspace(user);
		},
		sendOnSignUp: isLive,
	},
	socialProviders: {
		google: {
			clientId: process.env.GOOGLE_CLIENT_ID ?? "google-client-id",
			clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "google-client-secret",
		},
	},
	emailAndPassword: {
		enabled: true,
		autoSignIn: true,
		password: {
			hash: (password) => bcrypt.hash(password, 10),
			verify: ({ hash, password }) => bcrypt.compare(password, hash),
		},
		sendResetPassword: async ({ user, url }) => {
			await sendReactEmail({
				subject: "Reset your password - IELTS Agents",
				element: <PasswordReset url={url} />,
				to: user.email,
			});
		},
	},
});
