import { z } from "zod";

import { authProcedure } from "#./lib/auth-procedure.ts";
import { database } from "#./lib/database.ts";
import { getPlanDetailsForStripeCustomerId } from "#./lib/get-plan-details-for-stripe-customer-id.ts";
import { getStripePriceIdForPlan } from "#./lib/get-stripe-price-id-for-plan.ts";
import { planKeySchema } from "#./lib/plan-key-schema.ts";
import { safeCallbackSchema } from "#./lib/safe-callback-schema.ts";
import { stripe } from "#./lib/stripe.ts";
import { WorkspaceNotFoundError } from "#./lib/workspace-not-found-error.ts";

export const manage = authProcedure
	.input(z.object({ returnURL: safeCallbackSchema }))
	.mutation(async ({ ctx: { user }, input: { returnURL } }) => {
		const workspaceData = await database.query.workspace.findFirst({
			where: (table, { eq }) => eq(table.userId, user.id),
			columns: { stripeCustomerId: true },
		});
		if (!workspaceData) throw new WorkspaceNotFoundError();
		const billingSession = await stripe.billingPortal.sessions.create({
			customer: workspaceData.stripeCustomerId,
			return_url: returnURL,
		});
		return billingSession.url;
	});

export const update = authProcedure
	.input(
		z
			.object({
				plan: z.object({ key: planKeySchema, annual: z.boolean() }),
				succeedURL: safeCallbackSchema,
				returnURL: safeCallbackSchema,
			})
			.refine((data) => !(data.plan.key === "free" && data.plan.annual), {
				message: "free plan cannot be annual",
				path: ["plan", "annual"],
			}),
	)
	.mutation(
		async ({ ctx: { user }, input: { plan, succeedURL, returnURL } }) => {
			const workspaceData = await database.query.workspace.findFirst({
				where: (table, { eq }) => eq(table.userId, user.id),
				columns: { stripeCustomerId: true },
			});
			if (!workspaceData) throw new WorkspaceNotFoundError();
			const [
				currentPlan,
				planSchedule,
				currentSubscription,
				subscriptionSchedule,
			] = await getPlanDetailsForStripeCustomerId(
				workspaceData.stripeCustomerId,
				{ disableCache: true },
			);
			const selectedPlan = planSchedule ? planSchedule.plan : currentPlan;
			if (selectedPlan.key === plan.key && selectedPlan.annual === plan.annual)
				return;
			if (subscriptionSchedule)
				await stripe.subscriptionSchedules.release(subscriptionSchedule.id);
			if (plan.key === "free") {
				if (currentSubscription && !currentSubscription.cancel_at_period_end) {
					await stripe.subscriptions.update(currentSubscription.id, {
						cancel_at_period_end: true,
					});
				}
				return;
			}
			if (currentSubscription) {
				if (currentSubscription.cancel_at_period_end) {
					await stripe.subscriptions.update(currentSubscription.id, {
						cancel_at_period_end: false,
					});
				}
				if (currentPlan.key === plan.key && currentPlan.annual === plan.annual)
					return;
				const billingSession = await stripe.billingPortal.sessions.create({
					customer: workspaceData.stripeCustomerId,
					flow_data: {
						type: "subscription_update_confirm",
						subscription_update_confirm: {
							subscription: currentSubscription.id,
							items: [
								{
									id: currentSubscription.items.data[0].id,
									price: getStripePriceIdForPlan(plan),
								},
							],
						},
						after_completion: {
							type: "redirect",
							redirect: { return_url: succeedURL },
						},
					},
					return_url: returnURL,
				});
				return billingSession.url;
			}
			const checkoutSession = await stripe.checkout.sessions.create({
				customer: workspaceData.stripeCustomerId,
				mode: "subscription",
				line_items: [
					{
						quantity: 1,
						price: getStripePriceIdForPlan(plan),
					},
				],
				allow_promotion_codes: true,
				success_url: succeedURL,
				cancel_url: returnURL,
			});
			return checkoutSession.url;
		},
	);
