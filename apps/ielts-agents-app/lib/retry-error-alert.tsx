import { getErrorMessage } from "ielts-agents-internal-util";
import { OctagonXIcon, RotateCwIcon } from "lucide-react";

import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import { Spinner } from "~/components/ui/spinner";

interface RetryErrorAlertProps {
  error: unknown;
  isRefetching?: boolean;
  refetch?: () => Promise<unknown>;
  title: string;
}

export function RetryErrorAlert({
  error,
  isRefetching,
  refetch,
  title,
}: RetryErrorAlertProps) {
  return (
    <Alert className="max-w-2xl" variant="destructive">
      <OctagonXIcon />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription className="flex flex-col gap-2">
        {getErrorMessage(error)}
      </AlertDescription>
      {refetch && (
        <AlertAction>
          <Button
            disabled={isRefetching}
            size="xs"
            variant="destructive"
            onClick={() => void refetch()}
          >
            {isRefetching ? <Spinner /> : <RotateCwIcon />}
            Retry
          </Button>
        </AlertAction>
      )}
    </Alert>
  );
}
