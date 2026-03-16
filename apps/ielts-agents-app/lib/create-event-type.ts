import { randomId } from "@mantine/hooks";

export function createEventType() {
	return randomId("ielts-agents-event-");
}
