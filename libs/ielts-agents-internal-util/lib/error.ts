import { BetterFetchError } from "@better-fetch/fetch";

interface ErrorObject {
	message: string;
	code?: string;
}

function isErrorObject(error: unknown): error is ErrorObject {
	return (
		!!error &&
		typeof error === "object" &&
		"message" in error &&
		typeof error.message === "string" &&
		(!("code" in error) || typeof error.code === "string")
	);
}

export function getErrorMessage(error: unknown) {
	let message = "";
	if (typeof error === "string") {
		message ||= error;
	} else if (error instanceof BetterFetchError) {
		if (isErrorObject(error.error)) {
			message ||= error.error.message;
			message ||= error.error.code ?? "";
		} else {
			message ||= error.message;
			message ||= error.statusText;
			message ||= `HTTP ${error.status}`;
		}
	} else if (error instanceof Error) {
		message ||= error.message;
	} else if (isErrorObject(error)) {
		message ||= error.message;
		message ||= error.code ?? "";
	}
	message ||= "An error occurred.";
	return message;
}

export interface ErrorService {
	captureError: (error: unknown) => void;
}

export const errorService: ErrorService = {
	captureError: () => {
		// @ts-expect-error no DOM lib

		console.error(error);
	},
};

export function captureError(error: unknown) {
	errorService.captureError(error);
}

export const INSUFFICIENT_CREDITS_MESSAGE = "Insufficient credits";

export const CONTEXT_WINDOW_EXCEEDED_MESSAGE =
	"Your conversation is too long for this model. Please start a new chat.";

const CONTEXT_WINDOW_PATTERNS = [
	// OpenAI
	"maximum context length",
	"context_length_exceeded",
	// Anthropic
	"prompt is too long",
	"exceed context limit",
	// Google
	"content length limit",
	// Generic
	"token limit",
	"too many tokens",
];

export function isContextWindowExceededMessage(message: string): boolean {
	const lower = message.toLowerCase();
	return CONTEXT_WINDOW_PATTERNS.some((pattern) => lower.includes(pattern));
}

export class InsufficientCreditsError extends Error {
	constructor() {
		super(INSUFFICIENT_CREDITS_MESSAGE);
	}
}
