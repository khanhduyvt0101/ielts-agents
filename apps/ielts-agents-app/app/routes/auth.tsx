import type { Route } from "../routes/+types/auth";

import { AuthView, ChangeEmailCard } from "@daveyplate/better-auth-ui";
import { redirect } from "react-router";

import { authenticate } from "#./lib/authenticate.ts";
import { consumeCallback } from "#./lib/consume-callback.ts";
import { getSession } from "#./lib/get-session.ts";

export async function clientLoader({
  params: { path },
  request,
}: Route.ClientLoaderArgs) {
  switch (path) {
    case "sign-in":
    case "sign-up":
    case "magic-link":
    case "two-factor":
    case "recover-account":
    case "forgot-password": {
      const sessionData = await getSession();
      if (sessionData) {
        throw redirect(
          sessionData.user.emailVerified
            ? consumeCallback()
            : "/auth/verify-email",
        );
      }
      break;
    }
    case "verify-email": {
      const sessionData = await getSession();
      if (!sessionData) throw redirect("/auth/sign-in");
      if (sessionData.user.emailVerified) throw redirect(consumeCallback());
      break;
    }
    case "accept-invitation": {
      await authenticate(request.url);
      break;
    }
  }
}

export default function Component({ params: { path } }: Route.ComponentProps) {
  switch (path) {
    case "verify-email": {
      return (
        <div className="w-full max-w-sm [&>*:first-child]:hidden">
          <ChangeEmailCard />
        </div>
      );
    }
    default: {
      return <AuthView path={path} redirectTo="/auth-callback" />;
    }
  }
}
