"use client";

import { Archive, Loader2, ShieldAlert } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/Button";
import { PopConfirm } from "@/components/ui/PopConfirm";

import {
  useClientArchiveMutation,
  useClientsListMutationState,
} from "../hooks/useClientMutations";

type ArchiveClientControlProps = {
  clientId: string;
};

export const ArchiveClientControl = ({
  clientId,
}: ArchiveClientControlProps) => {
  const router = useRouter();
  const { clearClientsListCache } = useClientsListMutationState();
  const { archiveClient, error, isPending } = useClientArchiveMutation({
    onSuccess: () => {
      clearClientsListCache();
      router.push("/clients");
    },
  });

  return (
    <div className="space-y-3">
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
          onClick: () => {
            archiveClient(clientId);
          },
          type: "button",
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
      {error ? <p className="status-message status-error">{error}</p> : null}
      <p className="text-xs leading-5 text-muted-foreground">
        Coordinators do not see this control, and the API enforces
        owner/recruiter permission again before archiving.
      </p>
    </div>
  );
};
