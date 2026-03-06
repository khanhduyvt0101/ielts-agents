import type { Plan, PlanSchedule } from "ielts-agents-internal-util";
import type { Stripe } from "stripe";

import { SuperJSON } from "superjson";

import { redis } from "#./lib/redis.ts";
import { stripe } from "#./lib/stripe.ts";

const STRIPE_BASIC_2_MONTHLY_PRICE_ID = "price_1R6kujL0T68hAs8LddXKHjQG";
const STRIPE_BASIC_2_YEARLY_PRICE_ID = "price_1R6kujL0T68hAs8LriWT5OTu";
const STRIPE_BYOK_1_MONTHLY_PRICE_ID = "price_1RHnvaL0T68hAs8L4sodm47f";
const STRIPE_BYOK_1_YEARLY_PRICE_ID = "price_1RHnvaL0T68hAs8LfjJle8Bs";
const STRIPE_ELITE_2_MONTHLY_PRICE_ID = "price_1PVaPJL0T68hAs8Lurn2Ij4M";
const STRIPE_ELITE_2_YEARLY_PRICE_ID = "price_1PVaPIL0T68hAs8L1eA2zibu";
const STRIPE_ULTIMATE_2_MONTHLY_PRICE_ID = "price_1Q543WL0T68hAs8L1URL40jw";
const STRIPE_ULTIMATE_2_YEARLY_PRICE_ID = "price_1Q543WL0T68hAs8LtUoOSdQY";

function getPlanForStripePrice(
  price: Stripe.Price | Stripe.DeletedPrice | string,
): Plan {
  const priceId = typeof price === "string" ? price : price.id;
  switch (priceId) {
    case process.env.STRIPE_BASIC_MONTHLY_PRICE_ID:
    case STRIPE_BASIC_2_MONTHLY_PRICE_ID:
    case STRIPE_BYOK_1_MONTHLY_PRICE_ID: {
      return { key: "basic", annual: false };
    }
    case process.env.STRIPE_BASIC_YEARLY_PRICE_ID:
    case STRIPE_BASIC_2_YEARLY_PRICE_ID:
    case STRIPE_BYOK_1_YEARLY_PRICE_ID: {
      return { key: "basic", annual: true };
    }
    case process.env.STRIPE_ELITE_MONTHLY_PRICE_ID:
    case STRIPE_ELITE_2_MONTHLY_PRICE_ID: {
      return { key: "elite", annual: false };
    }
    case process.env.STRIPE_ELITE_YEARLY_PRICE_ID:
    case STRIPE_ELITE_2_YEARLY_PRICE_ID: {
      return { key: "elite", annual: true };
    }
    case process.env.STRIPE_ULTIMATE_MONTHLY_PRICE_ID:
    case STRIPE_ULTIMATE_2_MONTHLY_PRICE_ID: {
      return { key: "ultimate", annual: false };
    }
    case process.env.STRIPE_ULTIMATE_YEARLY_PRICE_ID:
    case STRIPE_ULTIMATE_2_YEARLY_PRICE_ID: {
      return { key: "ultimate", annual: true };
    }
    default: {
      throw new Error(`Failed to get plan for Stripe price: ${priceId}`);
    }
  }
}

const cacheExpirationSeconds = 7 * 24 * 60 * 60;

async function getSubscriptions(
  customerId: string,
  disableCache?: boolean,
): Promise<Stripe.ApiList<Stripe.Subscription>> {
  const cacheKey = `stripe:customers:${customerId}:subscriptions`;
  if (!disableCache) {
    const cacheData = await redis.get(cacheKey);
    if (cacheData) return SuperJSON.parse(cacheData);
  }
  const subscriptions = await stripe.subscriptions.list({
    customer: customerId,
    limit: 1,
    expand: ["data.schedule"],
  });
  await redis.set(cacheKey, SuperJSON.stringify(subscriptions), {
    expiration: { type: "EX", value: cacheExpirationSeconds },
  });
  return subscriptions;
}

async function getSubscriptionSchedule(
  customerId: string,
  scheduleId: string,
  disableCache?: boolean,
): Promise<Stripe.SubscriptionSchedule> {
  const cacheKey = `stripe:customers:${customerId}:schedules:${scheduleId}`;
  if (!disableCache) {
    const cacheData = await redis.get(cacheKey);
    if (cacheData) return SuperJSON.parse(cacheData);
  }
  const schedule = await stripe.subscriptionSchedules.retrieve(scheduleId);
  await redis.set(cacheKey, SuperJSON.stringify(schedule), {
    expiration: { type: "EX", value: cacheExpirationSeconds },
  });
  return schedule;
}

interface GetPlanDetailsForStripeCustomerIdOptions {
  disableCache?: boolean;
}

export async function getPlanDetailsForStripeCustomerId(
  stripeCustomerId: string,
  options?: GetPlanDetailsForStripeCustomerIdOptions,
): Promise<
  [
    Plan,
    PlanSchedule | undefined,
    Stripe.Subscription | undefined,
    Stripe.SubscriptionSchedule | undefined,
  ]
> {
  let currentPlan: Plan = { key: "free", annual: false };
  let planSchedule: PlanSchedule | undefined;
  const subscriptions = await getSubscriptions(
    stripeCustomerId,
    options?.disableCache,
  );
  let currentSubscription: Stripe.Subscription | undefined;
  let subscriptionSchedule: Stripe.SubscriptionSchedule | undefined;
  if (subscriptions.data.length > 0) {
    currentSubscription = subscriptions.data[0];
    currentPlan = getPlanForStripePrice(
      currentSubscription.items.data[0].price,
    );
    if (!planSchedule && currentSubscription.schedule) {
      subscriptionSchedule =
        typeof currentSubscription.schedule === "string"
          ? await getSubscriptionSchedule(
              stripeCustomerId,
              currentSubscription.schedule,
              options?.disableCache,
            )
          : currentSubscription.schedule;
      for (const phase of subscriptionSchedule.phases) {
        if (subscriptionSchedule.current_phase?.start_date === phase.start_date)
          continue;
        const { price } = phase.items[0];
        planSchedule = {
          plan: getPlanForStripePrice(price),
          date: new Date(phase.start_date * 1000),
        };
        break;
      }
    }
    if (!planSchedule && currentSubscription.cancel_at_period_end) {
      if (!currentSubscription.cancel_at)
        throw new Error("Failed to get Stripe subscription.cancel_at");
      planSchedule = {
        plan: { key: "free", annual: false },
        date: new Date(currentSubscription.cancel_at * 1000),
      };
    }
  }
  return [currentPlan, planSchedule, currentSubscription, subscriptionSchedule];
}
