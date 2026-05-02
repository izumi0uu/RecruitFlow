"use client";

import { Pencil } from "lucide-react";

import type {
  ClientRecord,
  ClientsListOwnerOption,
} from "@recruitflow/contracts";

import { Button } from "@/components/ui/Button";

import { ClientEditDialog } from "./ClientEditDialog";
import { useClientDetailEditAction } from "./hooks/useClientDetailEditAction";

type ClientDetailEditActionProps = {
  canManageClientControls: boolean;
  client: ClientRecord;
  ownerOptions: ClientsListOwnerOption[];
};

const ClientDetailEditAction = ({
  canManageClientControls,
  client,
  ownerOptions,
}: ClientDetailEditActionProps) => {
  const { handleClientUpdated, open, setOpen } = useClientDetailEditAction();

  if (client.status === "archived" || client.archivedAt) {
    return null;
  }

  return (
    <>
      <Button
        type="button"
        className="rounded-full"
        onClick={() => {
          setOpen(true);
        }}
      >
        <Pencil className="size-4" />
        Edit Client
      </Button>

      <ClientEditDialog
        canManageClientControls={canManageClientControls}
        client={client}
        onClientUpdated={handleClientUpdated}
        onOpenChange={setOpen}
        open={open}
        ownerOptions={ownerOptions}
      />
    </>
  );
};

export { ClientDetailEditAction };
