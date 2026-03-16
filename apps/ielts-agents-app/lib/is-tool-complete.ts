import type { IeltsAgentsToolPart } from "ielts-agents-api/types";

export function isToolComplete(state: IeltsAgentsToolPart["state"]) {
	return (
		state === "output-available" ||
		state === "output-error" ||
		state === "output-denied"
	);
}
