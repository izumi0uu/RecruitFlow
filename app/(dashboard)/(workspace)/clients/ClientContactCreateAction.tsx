"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/Button";

import { ClientContactCreateDialog } from "./ClientContactCreateDialog";

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
  const router = useRouter();
  const [open, setOpen] = React.useState(false);

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
        onContactCreated={() => {
          router.refresh();
        }}
        onOpenChange={setOpen}
        open={open}
      />
    </>
  );
};

export { ClientContactCreateAction };
