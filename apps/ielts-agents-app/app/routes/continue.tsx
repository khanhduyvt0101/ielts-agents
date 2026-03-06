import type { Route } from "#react-router/app/routes/+types/continue.ts";

import { getErrorMessage } from "ielts-agents-internal-util";
import { replace } from "react-router";
import { toast } from "sonner";

import { AppClose } from "#./lib/app-close.tsx";
import { normalizeCallback } from "#./lib/normalize-callback.ts";

export function clientLoader({ request }: Route.ClientLoaderArgs) {
  const url = new URL(request.url);
  const event = url.searchParams.get("event");
  switch (event) {
    case "authorized-cli": {
      if (url.searchParams.has("error")) {
        toast.error("Failed to authorize CLI", {
          description: getErrorMessage(url.searchParams.get("error")),
        });
      } else {
        toast.success("Authorized CLI successfully");
      }
      break;
    }
    case "updated-subscription": {
      toast.success("Updated subscription successfully");
      break;
    }
    case "migrated-subscription": {
      toast.success("Subscription migrated successfully");
      break;
    }
  }
  const callback = normalizeCallback(url.searchParams.get("callback"));
  throw replace(callback);
}

export default function Component() {
  return <AppClose />;
}
