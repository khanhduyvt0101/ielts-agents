import { captureException, init } from "@sentry/react";
import { errorService } from "ielts-agents-internal-util";

init({
  release: import.meta.env.VITE_SENTRY_RELEASE,
  dist: import.meta.env.VITE_SENTRY_DIST,
  environment: import.meta.env.VITE_SENTRY_ENVIRONMENT,
  dsn: import.meta.env.VITE_SENTRY_DSN,
  sampleRate: 1,
});

errorService.captureError = (error) => {
  captureException(error);
  console.error(error);
};
