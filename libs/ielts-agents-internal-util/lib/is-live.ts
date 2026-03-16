// @ts-nocheck Best effort to detect whether it's live or local environment
function isFlagEnabled(value: unknown) {
	return value === "1" || value === "true";
}

function isNextLive() {
	try {
		return (
			process.env.NODE_ENV === "production" &&
			process.env.NEXT_PUBLIC_VERCEL_ENV === "production" &&
			isFlagEnabled(process.env.NEXT_PUBLIC_CI)
		);
	} catch {
		return false;
	}
}

function isViteLive() {
	try {
		return (
			process.env.NODE_ENV === "production" &&
			import.meta.env.MODE === "production" &&
			import.meta.env.VITE_VERCEL_ENV === "production" &&
			Boolean(import.meta.env.PROD) &&
			isFlagEnabled(import.meta.env.VITE_CI)
		);
	} catch {
		return false;
	}
}

function isDockerLive() {
	try {
		return (
			process.env.NODE_ENV === "production" &&
			process.env.DOCKER_ENV === "live" &&
			isFlagEnabled(process.env.CI)
		);
	} catch {
		return false;
	}
}

export const isLive = isNextLive() || isViteLive() || isDockerLive();
