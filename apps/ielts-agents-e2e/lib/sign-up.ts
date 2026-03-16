import type { Page } from "@playwright/test";

export const testName = "Test User";

const testPassword = "TestPassword123!";

export async function signUp(page: Page, email: string) {
	await page.goto("/auth/sign-up");

	await page.getByLabel("Email").fill(email);
	await page.getByLabel("Name").fill(testName);
	await page.getByLabel("Password").fill(testPassword);
	await page.getByRole("button", { name: "Create an account" }).click();

	// Auth callback redirects to / which redirects to /reading
	await page.waitForURL(/\/reading$/);
}
