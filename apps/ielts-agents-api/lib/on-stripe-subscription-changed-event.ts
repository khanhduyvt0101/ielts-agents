import type { Stripe } from "stripe";

import { syncWorkspace } from "#./lib/sync-workspace.ts";
import { WorkspaceNotFoundError } from "#./lib/workspace-not-found-error.ts";

export async function onStripeSubscriptionChangedEvent(
  event:
    | Stripe.CustomerSubscriptionCreatedEvent
    | Stripe.CustomerSubscriptionUpdatedEvent
    | Stripe.CustomerSubscriptionDeletedEvent,
) {
  try {
    await syncWorkspace({
      stripeCustomerId:
        typeof event.data.object.customer === "string"
          ? event.data.object.customer
          : event.data.object.customer.id,
      disableCache: true,
    });
  } catch (error) {
    if (!(error instanceof WorkspaceNotFoundError)) throw error;
  }
}
