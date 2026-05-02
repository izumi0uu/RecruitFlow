"use client";

import { Loader2, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/Button";

import { useRestoreClientControl } from "./hooks/useRestoreClientControl";

type RestoreClientControlProps = {
  clientId: string;
};

export const RestoreClientControl = ({
  clientId,
}: RestoreClientControlProps) => {
  const { error, handleRestoreClient, isPending } = useRestoreClientControl();

  return (
    <div className="space-y-3">
      <Button
        className="rounded-full"
        disabled={isPending}
        type="button"
        variant="outline"
        onClick={() => {
          handleRestoreClient(clientId);
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
