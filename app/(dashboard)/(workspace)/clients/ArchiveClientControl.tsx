"use client";

import { useActionState, useId } from "react";
import { Archive, Loader2, ShieldAlert } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { PopConfirm } from "@/components/ui/PopConfirm";

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
  const formId = useId();
  const [state, formAction, isPending] = useActionState<
    ArchiveClientState,
    FormData
  >(archiveClientAction, {});

  return (
    <form id={formId} action={formAction} className="space-y-3">
      <input type="hidden" name="clientId" value={clientId} />
      <PopConfirm
        cancelText="Keep active"
        confirmButtonProps={{
          children: isPending ? (
            <>
              <Loader2 className="size-3.5 animate-spin" />
              Archiving
            </>
          ) : (
            "Confirm archive"
          ),
          disabled: isPending,
          form: formId,
          type: "submit",
        }}
        description={
          <>
            This hides the client from the default list. You can find it again
            with the Archived status filter.
          </>
        }
        icon={<ShieldAlert className="size-4" />}
        title="Archive this client?"
        variant="destructive"
      >
        {({ open }) => (
          <Button
            className="rounded-full"
            disabled={isPending}
            type="button"
            variant={open ? "outline" : "destructive"}
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
        )}
      </PopConfirm>
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
