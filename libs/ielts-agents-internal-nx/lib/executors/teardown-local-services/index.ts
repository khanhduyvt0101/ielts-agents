import Stripe from "stripe";

interface ExecutorOptions {
	stripeSecretKey: string;
	stripeTestId: string;
}

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 60_000;
const BATCH_SIZE = 5;

function isRateLimitError(error: unknown): boolean {
	if (error instanceof Stripe.errors.StripeRateLimitError) return true;
	if (error instanceof Stripe.errors.StripeError && error.statusCode === 429)
		return true;
	if (error instanceof Error && error.message.includes("rate limit"))
		return true;
	return false;
}

async function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
	for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
		try {
			return await fn();
		} catch (error) {
			if (!isRateLimitError(error) || attempt === MAX_RETRIES) throw error;
			console.log(
				`Stripe rate limit hit (attempt ${attempt}/${MAX_RETRIES}). Waiting ${RETRY_DELAY_MS / 1000}s before retry...`,
			);
			await sleep(RETRY_DELAY_MS);
		}
	}
	throw new Error("Unreachable");
}

async function findTestCustomers(
	stripe: Stripe,
	testId: string,
): Promise<string[]> {
	const customerIds: string[] = [];
	for await (const customer of stripe.customers.search({
		query: `metadata['test_id']:'${testId}'`,
	}))
		customerIds.push(customer.id);
	return customerIds;
}

async function deleteCustomerBatch(
	stripe: Stripe,
	ids: string[],
): Promise<void> {
	await Promise.all(ids.map((id) => stripe.customers.del(id)));
}

export default async function teardownLocalServices(
	options: ExecutorOptions,
): Promise<{ success: boolean }> {
	const stripe = new Stripe(options.stripeSecretKey);

	// Search with retry — rate limit can hit during pagination
	const customerIds = await withRetry(() =>
		findTestCustomers(stripe, options.stripeTestId),
	);

	if (customerIds.length === 0) return { success: true };

	console.log(`Deleting ${customerIds.length} test customer(s)...`);

	// Delete in small batches with retry to avoid rate limits
	for (let i = 0; i < customerIds.length; i += BATCH_SIZE) {
		const batch = customerIds.slice(i, i + BATCH_SIZE);
		await withRetry(() => deleteCustomerBatch(stripe, batch));
	}

	return { success: true };
}
