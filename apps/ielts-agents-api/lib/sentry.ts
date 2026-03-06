import { captureException, init } from "@sentry/node";
import { TRPCError } from "@trpc/server";
import { APICallError, InvalidToolInputError } from "ai";
import {
  errorService,
  InsufficientCreditsError,
  isContextWindowExceededMessage,
} from "ielts-agents-internal-util";

const EXPECTED_TRPC_ERROR_CODES = new Set(["UNAUTHORIZED", "BAD_REQUEST"]);

init({
  release: process.env.SENTRY_RELEASE,
  dist: process.env.SENTRY_DIST,
  environment: process.env.SENTRY_ENVIRONMENT,
  dsn: process.env.SENTRY_DSN,
  sampleRate: 1,
  beforeSend(event, hint) {
    const error = hint.originalException;
    if (
      error instanceof Error &&
      error.cause instanceof InsufficientCreditsError
    )
      return null;
    if (InvalidToolInputError.isInstance(error)) return null;
    if (
      APICallError.isInstance(error) &&
      error.statusCode === 400 &&
      isContextWindowExceededMessage(error.message)
    )
      return null;
    if (error instanceof TRPCError && EXPECTED_TRPC_ERROR_CODES.has(error.code))
      return null;
    return event;
  },
});

errorService.captureError = (error) => {
  captureException(error);
  console.error(error);
};
