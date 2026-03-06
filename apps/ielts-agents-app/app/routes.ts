import type { RouteConfig } from "@react-router/dev/routes";

import { index, layout, route } from "@react-router/dev/routes";

export default [
  layout("layouts/main.tsx", [
    index("routes/index.ts"),
    route("reading", "routes/reading.tsx"),
    route("chat/:id", "routes/chat.tsx"),
    route("account/settings", "routes/account/settings.tsx"),
    route("account/security", "routes/account/security.tsx"),
    route("account/billing", "routes/account/billing.tsx"),
    route("account/display", "routes/account/display.tsx"),
  ]),
  layout("layouts/alternate.tsx", [
    route("close", "routes/close.tsx"),
    route("auth-callback", "routes/auth-callback.tsx"),
    route("continue", "routes/continue.tsx"),
    route("auth/:path", "routes/auth.tsx"),
  ]),
] satisfies RouteConfig;
