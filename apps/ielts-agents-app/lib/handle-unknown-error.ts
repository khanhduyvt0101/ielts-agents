import { captureError, getErrorMessage } from "ielts-agents-internal-util";
import { toast } from "sonner";

export function handleUnknownError(error: unknown, toastId?: string | number) {
	captureError(error);
	toast.error("Something went wrong", {
		description: getErrorMessage(error),
		id: toastId,
	});
}
