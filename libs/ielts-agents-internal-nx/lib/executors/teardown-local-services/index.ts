import Stripe from "stripe";

interface ExecutorOptions {
  stripeSecretKey: string;
  stripeTestId: string;
}

export default async function teardownLocalServices(
  options: ExecutorOptions,
): Promise<{ success: boolean }> {
  const stripe = new Stripe(options.stripeSecretKey);
  const customerIds = new Set<string>();
  for await (const customer of stripe.customers.search({
    query: `metadata['test_id']:'${options.stripeTestId}'`,
  }))
    customerIds.add(customer.id);
  if (customerIds.size > 0) {
    await Promise.all(
      [...customerIds].map((customerId) => stripe.customers.del(customerId)),
    );
  }
  return { success: true };
}
