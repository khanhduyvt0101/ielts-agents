import { captureException, close as flushException } from "@sentry/node";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";

import { isBetterAuthCLI } from "#./lib/is-better-auth-cli.ts";
import * as schema from "#./lib/schema/index.ts";

const pgConfig = {
	connectionString:
		(process.env.PG_URL ?? "") ||
		"postgresql://postgres:postgres@localhost:5432/postgres",
} as const;

const drizzleConfig = { schema } as const;

async function runMigrations() {
	const pgClient = new pg.Client(pgConfig);
	await pgClient.connect();
	let exception: unknown;
	try {
		const database = drizzle(pgClient, drizzleConfig);
		await migrate(database, { migrationsFolder: "drizzle" });
	} catch (error) {
		exception = error;
	}
	await pgClient.end();
	if (exception) {
		captureException(exception);
		await flushException();
		throw exception;
	}
}

if (!isBetterAuthCLI) await runMigrations();

export const database = drizzle(new pg.Pool(pgConfig), drizzleConfig);
