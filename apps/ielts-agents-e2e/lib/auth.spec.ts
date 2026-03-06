import { expect, test } from "@playwright/test";

import { generateEmail } from "#./lib/generate-email.ts";
import { signUp } from "#./lib/sign-up.ts";

test.use({ baseURL: "http://localhost:42312" });

test("sign up works", async ({ page }) => {
  const email = generateEmail();
  await signUp(page, email);
  await expect(page).toHaveURL(/\/reading$/);
});
