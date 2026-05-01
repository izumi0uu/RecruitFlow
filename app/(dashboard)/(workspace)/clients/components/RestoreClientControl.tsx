"use client";

import { Loader2, RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/Button";

import {
  useClientRestoreMutation,
  useClientsListMutationState,
} from "../hooks/useClientMutations";

type RestoreClientControlProps = {
  clientId: string;
};

export const RestoreClientControl = ({
  clientId,
}: RestoreClientControlProps) => {
  const router = useRouter();
  const { clearClientsListCache } = useClientsListMutationState();
  const { error, isPending, restoreClient } = useClientRestoreMutation({
    onSuccess: () => {
      clearClientsListCache();
      router.refresh();
    },
  });

  return (
    <div className="space-y-3">
      <Button
        className="rounded-full"
        disabled={isPending}
        type="button"
        variant="outline"
        onClick={() => {
          restoreClient(clientId);
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
