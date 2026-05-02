"use client";

import { Plus } from "lucide-react";

import { Button } from "@/components/ui/Button";

import { ClientContactCreateDialog } from "./ClientContactCreateDialog";
import { useClientContactCreateAction } from "./hooks/useClientContactCreateAction";

type ClientContactCreateActionProps = {
  clientId: string;
  clientName: string;
  defaultIsPrimary: boolean;
};

const ClientContactCreateAction = ({
  clientId,
  clientName,
  defaultIsPrimary,
}: ClientContactCreateActionProps) => {
  const { handleContactCreated, open, setOpen } =
    useClientContactCreateAction();

  return (
    <>
      <Button
        size="sm"
        type="button"
        variant="outline"
        className="rounded-full"
        onClick={() => {
          setOpen(true);
        }}
      >
        <Plus className="size-3.5" />
        Add
      </Button>

      <ClientContactCreateDialog
        clientId={clientId}
        clientName={clientName}
        defaultIsPrimary={defaultIsPrimary}
        onContactCreated={handleContactCreated}
        onOpenChange={setOpen}
        open={open}
      />
    </>
  );
};

export { ClientContactCreateAction };
