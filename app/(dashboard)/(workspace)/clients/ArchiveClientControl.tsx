"use client";

import { useActionState } from "react";
import { Archive, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/Button";

import {
  archiveClientAction,
  type ArchiveClientState,
} from "./actions";

type ArchiveClientControlProps = {
  clientId: string;
};

export const ArchiveClientControl = ({
  clientId,
}: ArchiveClientControlProps) => {
  const [state, formAction, isPending] = useActionState<
    ArchiveClientState,
    FormData
  >(archiveClientAction, {});

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="clientId" value={clientId} />
      <Button
        className="rounded-full"
        disabled={isPending}
        type="submit"
        variant="destructive"
      >
        {isPending ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            Archiving...
          </>
        ) : (
          <>
            <Archive className="size-4" />
            Archive client
          </>
        )}
      </Button>
      {state.error ? (
        <p className="status-message status-error">{state.error}</p>
      ) : null}
      <p className="text-xs leading-5 text-muted-foreground">
        Coordinators do not see this control, and the API enforces
        owner/recruiter permission again before archiving.
      </p>
    </form>
  );
};
