"use client";

import { ContactRound, Loader2, Plus } from "lucide-react";

import type { ClientContactMutationResponse } from "@recruitflow/contracts";

import { Button } from "@/components/ui/Button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/Dialog";

import { ContactForm } from "./ContactForm";
import { useClientContactCreateDialog } from "./hooks/useClientContactCreateDialog";

type ClientContactCreateDialogProps = {
  clientId: string;
  clientName: string;
  defaultIsPrimary: boolean;
  onContactCreated: (contact: ClientContactMutationResponse) => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
};

const ClientContactCreateDialog = ({
  clientId,
  clientName,
  defaultIsPrimary,
  onContactCreated,
  onOpenChange,
  open,
}: ClientContactCreateDialogProps) => {
  const {
    error,
    handleSubmit,
    handleValuesChange,
    initialValues,
    isPending,
    success,
  } = useClientContactCreateDialog({
    clientId,
    defaultIsPrimary,
    onContactCreated,
    open,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Add contact</DialogTitle>
          <DialogDescription>
            Capture a relationship entry point for {clientName} without leaving
            the account overview.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="rounded-[1.65rem] border border-border/70 bg-workspace-muted-surface/45 p-4">
            <div className="flex items-start gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-[1.05rem] border border-border/70 bg-background/72">
                <ContactRound className="size-4 text-muted-foreground" />
              </span>
              <div>
                <p className="text-sm font-medium text-foreground">
                  Contact baseline
                </p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  The first contact can become primary automatically, so the
                  client page always has a useful handoff person.
                </p>
              </div>
            </div>
          </div>

          <ContactForm
            clientId={clientId}
            error={error}
            footerClassName="flex flex-wrap items-center justify-end gap-3"
            idPrefix="contact-create"
            initialValues={initialValues}
            isPending={isPending}
            mode="create"
            pendingContent={
              <>
                <Loader2 className="size-4 animate-spin" />
                Creating...
              </>
            }
            secondaryAction={
              <DialogClose asChild>
                <Button type="button" variant="outline" className="rounded-full">
                  Close
                </Button>
              </DialogClose>
            }
            submitContent={
              <>
                <Plus className="size-4" />
                Create contact
              </>
            }
            success={success}
            onSubmit={handleSubmit}
            onValuesChange={handleValuesChange}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export { ClientContactCreateDialog };
