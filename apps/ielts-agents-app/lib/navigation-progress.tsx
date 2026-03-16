import { useEffect, useRef, useState } from "react";
import { useNavigation } from "react-router";

import { cn } from "~/lib/utils";

function getIncrement(progress: number): number {
	if (progress < 20) return 10;
	if (progress < 50) return 4;
	if (progress < 80) return 2;
	if (progress < 99) return 0.5;
	return 0;
}

export function NavigationProgress() {
	const navigation = useNavigation();
	const ref = useRef(false);
	const [isVisible, setIsVisible] = useState(false);
	const [progress, setProgress] = useState(0);
	useEffect(() => {
		if (navigation.state === "loading" || navigation.state === "submitting") {
			setProgress(ref.current ? 0.5 : 0);
			const interval = setInterval(() => {
				ref.current = true;
				setIsVisible(true);
				setProgress((progress) =>
					Math.min(progress + getIncrement(progress), 99),
				);
			}, 200);
			return () => {
				clearInterval(interval);
			};
		}
		if (ref.current) {
			setProgress(100);
			const hideTimeout = setTimeout(() => {
				ref.current = false;
				setIsVisible(false);
			}, 200);
			const resetTimeout = setTimeout(() => {
				setProgress(0);
			}, 400);
			return () => {
				clearTimeout(hideTimeout);
				clearTimeout(resetTimeout);
			};
		}
	}, [navigation]);
	return (
		<div
			aria-hidden
			className={cn(
				"pointer-events-none fixed top-0 left-0 z-9999 h-0.5 bg-sidebar-primary",
				isVisible ? "opacity-100" : "opacity-0",
				progress > 0 && "transition-all duration-200 ease-linear",
			)}
			style={{ width: `${progress}%` }}
		/>
	);
}
