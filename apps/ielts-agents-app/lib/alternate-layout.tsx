import type { PropsWithChildren } from "react";

export function AlternateLayout({ children }: PropsWithChildren) {
	return (
		<div className="flex min-h-screen w-full flex-col">
			<div className="h-16 shrink-0" />
			<main className="flex flex-1 flex-col items-center justify-center px-4">
				{children}
			</main>
			<div className="h-16 shrink-0" />
		</div>
	);
}
