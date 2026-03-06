import type { Plan } from "ielts-agents-internal-util";

export function getStripePriceIdForPlan(plan: Plan) {
  switch (plan.key) {
    case "basic": {
      return plan.annual
        ? process.env.STRIPE_BASIC_YEARLY_PRICE_ID
        : process.env.STRIPE_BASIC_MONTHLY_PRICE_ID;
    }
    case "elite": {
      return plan.annual
        ? process.env.STRIPE_ELITE_YEARLY_PRICE_ID
        : process.env.STRIPE_ELITE_MONTHLY_PRICE_ID;
    }
    case "ultimate": {
      return plan.annual
        ? process.env.STRIPE_ULTIMATE_YEARLY_PRICE_ID
        : process.env.STRIPE_ULTIMATE_MONTHLY_PRICE_ID;
    }
    default: {
      throw new Error(`Failed to get Stripe price ID for plan: ${plan.key}`);
    }
  }
}
