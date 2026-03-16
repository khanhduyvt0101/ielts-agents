import { captureError, getErrorMessage } from "ielts-agents-internal-util";
import { getDefaultStore } from "jotai";
import { FrownIcon } from "lucide-react";
import type { PropsWithChildren } from "react";
import { useEffect } from "react";
import {
	isRouteErrorResponse,
	Links,
	Meta,
	Outlet,
	Scripts,
	ScrollRestoration,
} from "react-router";
import { AlternateLayout } from "#./lib/alternate-layout.tsx";
import { AppSpinner } from "#./lib/app-spinner.tsx";
import { hydrationAtom } from "#./lib/hydration-atom.ts";
import { NavigationProgress } from "#./lib/navigation-progress.tsx";
import type { Route } from "#react-router/app/+types/root.ts";
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "~/components/ui/empty";
import { Toaster } from "~/lib/toaster";

import { Preload } from "./preload.tsx";
import { Provider } from "./provider.tsx";

export const clientMiddleware: Route.ClientMiddlewareFunction[] = [
	async (_args, next) => {
		const store = getDefaultStore();
		await store.get(hydrationAtom);
		return next();
	},
];

export const meta: Route.MetaFunction = () => [{ title: "IELTS Agents" }];

export function Layout({ children }: PropsWithChildren) {
	return (
		<html suppressHydrationWarning lang="en">
			<head>
				<meta charSet="utf-8" />
				<meta content="width=device-width, initial-scale=1" name="viewport" />
				<Meta />
				<Preload />
				<Links />
			</head>
			<body>
				<Provider>
					<NavigationProgress />
					{children}
					<Toaster />
				</Provider>
				<ScrollRestoration />
				<Scripts />
			</body>
		</html>
	);
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
	useEffect(() => {
		if (isRouteErrorResponse(error) && error.status < 500) return;
		captureError(error);
	}, [error]);
	return (
		<AlternateLayout>
			<Empty>
				<EmptyHeader>
					<EmptyMedia
						className="border-none bg-red-50 dark:bg-red-950"
						variant="icon"
					>
						<FrownIcon className="text-destructive" />
					</EmptyMedia>
					<EmptyTitle className="text-destructive">
						Something Went Wrong
					</EmptyTitle>
					<EmptyDescription className="text-destructive">
						{getErrorMessage(error)}
					</EmptyDescription>
				</EmptyHeader>
			</Empty>
		</AlternateLayout>
	);
}

export function HydrateFallback() {
	return (
		<AlternateLayout>
			<AppSpinner />
		</AlternateLayout>
	);
}

export default function Component() {
	return <Outlet />;
}
