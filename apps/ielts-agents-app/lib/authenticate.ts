import { redirect } from "react-router";

import { getSession } from "#./lib/get-session.ts";
import { produceCallback } from "#./lib/produce-callback.ts";

export async function authenticate(url: string) {
  const sessionData = await getSession();
  if (!sessionData) {
    produceCallback(url);
    throw redirect("/auth/sign-in");
  }
  if (!sessionData.user.emailVerified) {
    produceCallback(url);
    throw redirect("/auth/verify-email");
  }
  return sessionData;
}
