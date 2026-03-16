import { expect, test } from "@playwright/test";

import { generateEmail } from "#./lib/generate-email.ts";
import { signUp, testName } from "#./lib/sign-up.ts";

test.use({ baseURL: "http://localhost:42312" });

test("sign up, then upgrade to basic plan, and redirect back with new plan & credits", async ({
	page,
}) => {
	const email = generateEmail();
	await signUp(page, email);

	// Navigate to billing page
	await page.goto("/account/billing");

	// Wait for subscription card to load and verify free plan
	await expect(page.getByText("Free").first()).toBeVisible();

	// Click Change Plan
	await page.getByRole("button", { name: "Change Plan" }).click();

	// Wait for dialog to open and select Basic plan
	await expect(
		page.getByRole("heading", { name: "Change Plan" }),
	).toBeVisible();
	await page.getByRole("radio", { name: /Basic/ }).click();

	// Submit the plan change
	await page.getByRole("button", { name: "Update Subscription" }).click();

	// Wait for redirect to Stripe checkout
	await page.waitForURL(/checkout\.stripe\.com/);

	// Stripe may show card fields directly or behind a payment method accordion
	const cardNumber = page.getByLabel("Card number");
	const cardRadio = page.getByRole("radio", { name: "Card" });
	await expect(cardNumber.or(cardRadio)).toBeVisible();
	if (await cardRadio.isVisible()) await cardRadio.click({ force: true });

	// Fill in Stripe hosted checkout form
	await cardNumber.fill("4242424242424242");
	await page.getByLabel("Expiration").fill("1230");
	await page.getByRole("textbox", { name: "CVC" }).fill("123");
	await page.getByLabel("Cardholder name").fill(testName);

	// Fill ZIP code if shown (US locale requires it)
	const zip = page.getByLabel("ZIP");
	if (await zip.isVisible()) await zip.fill("10001");

	// Uncheck "Save my information" if shown (Stripe Link requires phone number)
	const saveInfo = page.getByRole("checkbox", {
		name: "Save my information for faster checkout",
	});
	if ((await saveInfo.isVisible()) && (await saveInfo.isChecked()))
		await saveInfo.uncheck();

	// Submit payment
	await page.getByRole("button", { name: "Subscribe" }).click();

	// Wait for redirect back to billing page via /continue route
	// Stripe payment processing + redirect can take a while
	await page.waitForURL(/\/account\/billing$/, { timeout: 30_000 });

	// Verify the plan is now Basic with 10,000 credits
	await expect(page.getByText("Basic").first()).toBeVisible();
	await expect(page.getByText("10,000 monthly credits").first()).toBeVisible();
});
