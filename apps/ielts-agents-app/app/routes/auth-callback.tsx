import type { SessionData } from "#./lib/session-data.ts";

import { useTimeout } from "@mantine/hooks";
import { useNavigate } from "react-router";

import { AppSpinner } from "#./lib/app-spinner.tsx";
import { consumeCallback } from "#./lib/consume-callback.ts";
import { useSession } from "#./lib/use-session.ts";

function callback(data: SessionData | null) {
  if (!data) return "/auth/sign-in";
  if (!data.user.emailVerified) return "/auth/verify-email";
  return consumeCallback();
}

interface ReplaceProps {
  data: SessionData | null;
}

function Replace({ data }: ReplaceProps) {
  const navigate = useNavigate();
  useTimeout(() => void navigate(callback(data), { replace: true }), 200, {
    autoInvoke: true,
  });
  return null;
}

export default function Component() {
  const { isPending, data } = useSession();
  return (
    <>
      {isPending || <Replace data={data} />}
      <AppSpinner />
    </>
  );
}
