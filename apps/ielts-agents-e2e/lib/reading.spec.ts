import { expect, test } from "@playwright/test";

import { generateEmail } from "#./lib/generate-email.ts";
import { signUp } from "#./lib/sign-up.ts";

test.use({ baseURL: "http://localhost:42312" });

test("reading: page renders with all key elements visible", async ({
	page,
}) => {
	const email = generateEmail();
	await signUp(page, email);

	// Breadcrumb
	await expect(page.getByRole("link", { name: "Reading" })).toBeVisible();

	// Welcome text
	await expect(
		page.getByRole("heading", { name: "IELTS Reading Test Generator" }),
	).toBeVisible();
	await expect(
		page.getByText("Generate practice IELTS reading tests on any topic"),
	).toBeVisible();

	// Textarea
	await expect(
		page.getByPlaceholder("Describe the topic for your IELTS reading test..."),
	).toBeVisible();

	// Submit button
	await expect(page.getByRole("button", { name: "Submit" })).toBeVisible();

	// All 4 suggestion buttons
	await expect(
		page.getByRole("button", {
			name: "Climate change and its effects on marine ecosystems",
		}),
	).toBeVisible();
	await expect(
		page.getByRole("button", {
			name: "The history and evolution of artificial intelligence",
		}),
	).toBeVisible();
	await expect(
		page.getByRole("button", {
			name: "Space exploration and the colonization of Mars",
		}),
	).toBeVisible();
	await expect(
		page.getByRole("button", {
			name: "The impact of social media on modern communication",
		}),
	).toBeVisible();
});

test("reading: suggestion prompt populates textarea", async ({ page }) => {
	const email = generateEmail();
	await signUp(page, email);

	const suggestion = "Climate change and its effects on marine ecosystems";
	await page.getByRole("button", { name: suggestion }).click();

	await expect(
		page.getByPlaceholder("Describe the topic for your IELTS reading test..."),
	).toHaveValue(suggestion);
});

test("reading: band score selector opens and switches band", async ({
	page,
}) => {
	const email = generateEmail();
	await signUp(page, email);

	// Wait for band score selector showing default "Band 6.5"
	const bandButton = page.getByRole("combobox").filter({ hasText: "Band 6.5" });
	await expect(bandButton).toBeVisible();

	// Open select
	await bandButton.click();

	// Assert band score options visible
	await expect(page.getByRole("option", { name: "Band 5.0" })).toBeVisible();
	await expect(page.getByRole("option", { name: "Band 7.0" })).toBeVisible();
	await expect(page.getByRole("option", { name: "Band 9.0" })).toBeVisible();

	// Close select
	await page.keyboard.press("Escape");
});

test("reading: submit a chat message redirects to /chat/{id} and generates test", async ({
	page,
}) => {
	test.setTimeout(180_000); // AI generation can take a long time
	const email = generateEmail();
	await signUp(page, email);

	// Fill textarea
	await page
		.getByPlaceholder("Describe the topic for your IELTS reading test...")
		.fill("The effects of urbanization on biodiversity");

	// Click Submit
	await page.getByRole("button", { name: "Submit" }).click();

	// Wait for redirect to /chat/<id>
	await page.waitForURL(/\/chat\/\d+$/, { timeout: 15_000 });
	await expect(page).toHaveURL(/\/chat\/\d+$/);

	// Wait for the Reading Test UI to appear
	await expect(page.getByRole("heading", { name: "Reading Test" })).toBeVisible(
		{ timeout: 15_000 },
	);
	await expect(page.getByText("Band 6.5").first()).toBeVisible();

	// Initially we should be waiting for generation
	await expect(page.getByText("Generating your reading test...")).toBeVisible();

	// The passage should be visible in the initial active tab
	// (We use a very long timeout here since AI generation takes time)
	const passageTitle = page.locator("h2.font-bold").first();
	await expect(passageTitle).toBeVisible({ timeout: 120_000 });

	// Verify tabs (questions and vocab are generated after the passage, so we need to wait)
	await expect(page.getByRole("tab", { name: /Questions/ })).toBeVisible({
		timeout: 60_000,
	});
	await expect(page.getByRole("tab", { name: /Vocab/ })).toBeVisible({
		timeout: 60_000,
	});

	// And the conversation log should show our initial prompt
	const conversation = page.getByRole("log");
	await expect(conversation).toBeVisible();
	await expect(conversation.locator(".is-user").first()).toContainText(
		"The effects of urbanization on biodiversity",
	);
});

test("reading: submit via suggestion prompt redirects to /chat/{id}", async ({
	page,
}) => {
	const email = generateEmail();
	await signUp(page, email);

	// Click a suggestion
	await page
		.getByRole("button", {
			name: "The history and evolution of artificial intelligence",
		})
		.click();

	// Verify textarea is populated
	await expect(
		page.getByPlaceholder("Describe the topic for your IELTS reading test..."),
	).toHaveValue("The history and evolution of artificial intelligence");

	// Submit
	await page.getByRole("button", { name: "Submit" }).click();

	// Wait for redirect
	await page.waitForURL(/\/chat\/\d+$/, { timeout: 15_000 });
	await expect(page).toHaveURL(/\/chat\/\d+$/);
});

test("reading: sidebar agents visible", async ({ page }) => {
	const email = generateEmail();
	await signUp(page, email);

	const sidebar = page.locator('[data-sidebar="sidebar"]');

	// Reading agent visible in sidebar
	await expect(sidebar.getByText("Reading")).toBeVisible();
});
