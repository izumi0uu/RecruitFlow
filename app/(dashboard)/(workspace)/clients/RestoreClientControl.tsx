"use client";

import { useState } from "react";
import { Loader2, RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/Button";

type RestoreClientControlProps = {
  clientId: string;
};

const getRestoreErrorMessage = async (response: Response) => {
  try {
    const body = (await response.json()) as { error?: string };

    if (body.error) {
      return body.error;
    }
  } catch {
    // Keep the user-facing fallback below if the response body is not JSON.
  }

  return `Restore failed with status ${response.status}`;
};

export const RestoreClientControl = ({
  clientId,
}: RestoreClientControlProps) => {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  const restoreClient = async () => {
    setError(null);
    setIsPending(true);

    try {
      const response = await fetch(`/api/clients/${clientId}/restore`, {
        method: "PATCH",
      });

      if (!response.ok) {
        setError(await getRestoreErrorMessage(response));
        return;
      }

      router.refresh();
    } catch (restoreError) {
      setError(
        restoreError instanceof Error
          ? restoreError.message
          : "Unable to restore client.",
      );
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="space-y-3">
      <Button
        className="rounded-full"
        disabled={isPending}
        type="button"
        variant="outline"
        onClick={() => {
          void restoreClient();
        }}
      >
        {isPending ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            Restoring...
          </>
        ) : (
          <>
            <RotateCcw className="size-4" />
            Restore client
          </>
        )}
      </Button>
      {error ? <p className="status-message status-error">{error}</p> : null}
    </div>
  );
};
