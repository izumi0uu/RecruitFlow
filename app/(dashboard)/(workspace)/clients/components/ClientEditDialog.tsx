"use client";

import { Loader2, Save, Sparkles } from "lucide-react";

import type {
  ClientMutationResponse,
  ClientRecord,
  ClientsListOwnerOption,
} from "@recruitflow/contracts";

import { Button } from "@/components/ui/Button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/Dialog";
import { FilterSelect } from "@/components/ui/FilterSelect";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";

import { useClientEditDialog } from "./hooks/useClientEditDialog";

type ClientEditDialogProps = {
  canManageClientControls: boolean;
  client: ClientRecord | null;
  onClientUpdated: (client: ClientMutationResponse) => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  ownerOptions: ClientsListOwnerOption[];
};

const ClientEditDialog = ({
  canManageClientControls,
  client,
  onClientUpdated,
  onOpenChange,
  open,
  ownerOptions,
}: ClientEditDialogProps) => {
  const {
    error,
    handleSubmit,
    isArchived,
    isPending,
    ownerSelectOptions,
    priorityOptions,
    statusOptions,
    success,
    updateValue,
    values,
  } = useClientEditDialog({
    canManageClientControls,
    client,
    onClientUpdated,
    open,
    ownerOptions,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Edit client</DialogTitle>
          <DialogDescription>
            Keep the baseline account record accurate without leaving the
            current recruiting surface.
          </DialogDescription>
        </DialogHeader>

        {!client || !values ? (
          <p className="status-message border-border/70 bg-surface-1/70 text-muted-foreground">
            Select a client to edit.
          </p>
        ) : isArchived ? (
          <p className="status-message status-error">
            Archived clients are read-only from this modal. Restore or manage
            archive state from the client detail flow.
          </p>
        ) : (
          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="rounded-[1.65rem] border border-border/70 bg-workspace-muted-surface/45 p-4">
              <div className="flex items-start gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-[1.05rem] border border-border/70 bg-background/72">
                  <Sparkles className="size-4 text-muted-foreground" />
                </span>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {client.name}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    Edit descriptive fields here; contacts, jobs, and archive
                    controls stay in their dedicated flows.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-2 lg:col-span-2">
                <Label htmlFor="client-edit-name">Client name</Label>
                <Input
                  id="client-edit-name"
                  placeholder="Acme Robotics"
                  required
                  value={values.name}
                  onChange={(event) => {
                    updateValue("name", event.target.value);
                  }}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="client-edit-industry">Industry</Label>
                <Input
                  id="client-edit-industry"
                  placeholder="Industrial automation"
                  value={values.industry}
                  onChange={(event) => {
                    updateValue("industry", event.target.value);
                  }}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="client-edit-website">Website</Label>
                <Input
                  id="client-edit-website"
                  placeholder="acme.example"
                  value={values.website}
                  onChange={(event) => {
                    updateValue("website", event.target.value);
                  }}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="client-edit-location">HQ location</Label>
                <Input
                  id="client-edit-location"
                  placeholder="Austin, TX"
                  value={values.hqLocation}
                  onChange={(event) => {
                    updateValue("hqLocation", event.target.value);
                  }}
                />
              </div>

              {canManageClientControls ? (
                <>
                  <div className="space-y-2">
                    <Label>Client owner</Label>
                    <FilterSelect
                      value={values.ownerUserId}
                      options={ownerSelectOptions}
                      placeholder="Keep current owner"
                      onValueChange={(ownerUserId) => {
                        updateValue("ownerUserId", ownerUserId);
                      }}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Status</Label>
                    <FilterSelect
                      value={values.status}
                      options={statusOptions}
                      placeholder="Active"
                      onValueChange={(status) => {
                        updateValue("status", status);
                      }}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Priority</Label>
                    <FilterSelect
                      value={values.priority}
                      options={priorityOptions}
                      placeholder="Medium"
                      onValueChange={(priority) => {
                        updateValue("priority", priority);
                      }}
                    />
                  </div>
                </>
              ) : (
                <div className="rounded-[1.35rem] border border-border/70 bg-surface-1/70 p-4 lg:col-span-2">
                  <p className="text-sm font-medium text-foreground">
                    Owner, status, and priority are locked for coordinators.
                  </p>
                  <p className="mt-2 text-xs leading-5 text-muted-foreground">
                    Descriptive edits are still saved with the existing
                    management fields preserved.
                  </p>
                </div>
              )}

              <div className="space-y-2 lg:col-span-2">
                <Label htmlFor="client-edit-notes">Notes preview</Label>
                <textarea
                  id="client-edit-notes"
                  className="input min-h-28 resize-y py-3"
                  placeholder="Hiring appetite, relationship context, or the next thing the team should know."
                  value={values.notesPreview}
                  onChange={(event) => {
                    updateValue("notesPreview", event.target.value);
                  }}
                />
              </div>
            </div>

            {error ? (
              <p className="status-message status-error">{error}</p>
            ) : null}
            {success ? (
              <p className="status-message status-success">{success}</p>
            ) : null}

            <div className="flex flex-wrap items-center justify-end gap-3">
              <DialogClose asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-full"
                >
                  Close
                </Button>
              </DialogClose>
              <Button
                type="submit"
                className="rounded-full"
                disabled={isPending}
              >
                {isPending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="size-4" />
                    Save client
                  </>
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};

export { ClientEditDialog };
