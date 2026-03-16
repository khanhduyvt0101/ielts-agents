import { AuthQueryProvider } from "@daveyplate/better-auth-tanstack";
import type { AuthLocalization } from "@daveyplate/better-auth-ui";
import { AuthUIProviderTanstack } from "@daveyplate/better-auth-ui/tanstack";
import { QueryClientProvider } from "@tanstack/react-query";
import { appURL, isLive } from "ielts-agents-internal-util";
import type { PropsWithChildren, ReactNode } from "react";
import { lazy, Suspense, useCallback } from "react";
import { Link, useNavigate } from "react-router";

import { authClient } from "#./lib/auth-client.ts";
import { getSession } from "#./lib/get-session.ts";
import { JotaiConnector } from "#./lib/jotai-connector.ts";
import { queryClient } from "#./lib/query-client.ts";
import { sessionQueryOptions } from "#./lib/session-query-options.ts";
import { ThemeConnector } from "#./lib/theme-connector.ts";

const onSessionChange = async () => {
	const sessionData = await getSession();
	if (sessionData) return;
	await queryClient.resetQueries({
		predicate: (query) => query.queryKey !== sessionQueryOptions.queryKey,
	});
};

const authLocalization: AuthLocalization = {
	NAME_DESCRIPTION: "Enter your full name or a display name.",
	CHANGE_PASSWORD: "Password",
};

interface AuthLinkProps {
	className?: string;
	href: string;
	children: ReactNode;
}

function AuthLink({ href, className, children }: AuthLinkProps) {
	return (
		<Link className={className} to={href}>
			{children}
		</Link>
	);
}

function AuthProvider({ children }: PropsWithChildren) {
	const navigate = useNavigate();
	const navigateCallback = useCallback(
		(href: string) => void navigate(href),
		[navigate],
	);
	const replaceCallback = useCallback(
		(href: string) => void navigate(href, { replace: true }),
		[navigate],
	);
	return (
		<AuthUIProviderTanstack
			emailVerification
			authClient={authClient}
			baseURL={appURL}
			Link={AuthLink}
			localization={authLocalization}
			navigate={navigateCallback}
			redirectTo="/auth-callback"
			replace={replaceCallback}
			social={isLive ? { providers: ["google"] } : undefined}
			onSessionChange={onSessionChange}
		>
			{children}
		</AuthUIProviderTanstack>
	);
}

const QueryDevtools = import.meta.env.DEV
	? lazy(() =>
			import("@tanstack/react-query-devtools").then((mod) => ({
				default: mod.ReactQueryDevtools,
			})),
		)
	: () => null;

export function Provider({ children }: PropsWithChildren) {
	return (
		<>
			<ThemeConnector />
			<JotaiConnector />
			<QueryClientProvider client={queryClient}>
				<AuthQueryProvider sessionKey={sessionQueryOptions.queryKey}>
					<AuthProvider>{children}</AuthProvider>
				</AuthQueryProvider>
				<Suspense>
					<QueryDevtools />
				</Suspense>
			</QueryClientProvider>
		</>
	);
}
