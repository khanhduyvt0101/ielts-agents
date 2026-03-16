import { handleRequest } from "@vercel/react-router/entry.server";
import type {
	HandleDocumentRequestFunction,
	HandleErrorFunction,
} from "react-router";
import { isRouteErrorResponse } from "react-router";

export const streamTimeout = 5000;

export const handleError: HandleErrorFunction = (error, { request }) => {
	if (
		request.signal.aborted ||
		(isRouteErrorResponse(error) && error.status < 500)
	)
		return;
	console.error(error);
};

const handleDocumentRequest: HandleDocumentRequestFunction = async (
	request,
	responseStatusCode,
	responseHeaders,
	routerContext,
) => {
	const response = await handleRequest(
		request,
		responseStatusCode,
		responseHeaders,
		routerContext,
	);
	return response;
};

export default handleDocumentRequest;
