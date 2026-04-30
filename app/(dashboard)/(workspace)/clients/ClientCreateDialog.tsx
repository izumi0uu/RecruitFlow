"use client";

import * as React from "react";
import { useMutation } from "@tanstack/react-query";
import { Loader2, Plus, Sparkles } from "lucide-react";

import {
  apiClientEditableStatusValues,
  apiClientPriorityValues,
  clientMutationRequestSchema,
  type ApiClientEditableStatus,
  type ApiClientPriority,
  type ClientMutationRequest,
  type ClientMutationResponse,
  type ClientsListOwnerOption,
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

type ClientCreateDialogProps = {
  canManageClientControls: boolean;
  onClientCreated: (client: ClientMutationResponse) => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  ownerOptions: ClientsListOwnerOption[];
};

type ClientCreateValues = {
  hqLocation: string;
  industry: string;
  name: string;
  notesPreview: string;
  ownerUserId: string;
  priority: ApiClientPriority;
  status: ApiClientEditableStatus;
  website: string;
};

type ApiErrorBody = {
  error?: string;
  message?: string | string[];
};

const statusLabelMap: Record<ApiClientEditableStatus, string> = {
  active: "Active",
  paused: "Paused",
  prospect: "Prospect",
};

const priorityLabelMap: Record<ApiClientPriority, string> = {
  high: "High",
  low: "Low",
  medium: "Medium",
};

const emptyValues: ClientCreateValues = {
  hqLocation: "",
  industry: "",
  name: "",
  notesPreview: "",
  ownerUserId: "",
  priority: "medium",
  status: "active",
  website: "",
};

const statusOptions = apiClientEditableStatusValues.map((status) => ({
  label: statusLabelMap[status],
  value: status,
}));

const priorityOptions = apiClientPriorityValues.map((priority) => ({
  label: priorityLabelMap[priority],
  value: priority,
}));

const emptyToUndefined = (value: string) => {
  const trimmedValue = value.trim();

  return trimmedValue.length > 0 ? trimmedValue : undefined;
};

const getClientPayload = (
  values: ClientCreateValues,
  canManageClientControls: boolean,
) => {
  return {
    hqLocation: values.hqLocation,
    industry: values.industry,
    name: values.name,
    notesPreview: values.notesPreview,
    ownerUserId: canManageClientControls
      ? emptyToUndefined(values.ownerUserId)
      : undefined,
    priority: canManageClientControls ? values.priority : "medium",
    status: canManageClientControls ? values.status : "active",
    website: values.website,
  };
};

const getErrorMessage = (body: unknown, fallbackStatus: number) => {
  if (body && typeof body === "object") {
    const { error, message } = body as ApiErrorBody;

    if (typeof error === "string" && error.trim()) {
      return error;
    }

    if (Array.isArray(message) && message.length > 0) {
      return String(message[0]);
    }

    if (typeof message === "string" && message.trim()) {
      return message;
    }
  }

  return `Request failed with status ${fallbackStatus}`;
};

const createClient = async (payload: ClientMutationRequest) => {
  const response = await fetch("/api/clients", {
    body: JSON.stringify(payload),
    headers: {
      accept: "application/json",
      "content-type": "application/json",
    },
    method: "POST",
  });
  const body = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(getErrorMessage(body, response.status));
  }

  return body as ClientMutationResponse;
};

const ClientCreateDialog = ({
  canManageClientControls,
  onClientCreated,
  onOpenChange,
  open,
  ownerOptions,
}: ClientCreateDialogProps) => {
  const [values, setValues] = React.useState<ClientCreateValues>(emptyValues);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);
  const createClientMutation = useMutation({
    mutationFn: createClient,
    onError: (caughtError) => {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to create client.",
      );
    },
    onSuccess: (createdClient) => {
      setValues(emptyValues);
      setSuccess(createdClient.message);
      onClientCreated(createdClient);
    },
  });
  const ownerSelectOptions = React.useMemo(
    () => [
      { label: "Default to me", value: "" },
      ...ownerOptions.map((owner) => ({
        label: owner.name ?? owner.email,
        value: owner.id,
      })),
    ],
    [ownerOptions],
  );

  const updateValue = (name: keyof ClientCreateValues, value: string) => {
    setValues((currentValues) => ({
      ...currentValues,
      [name]: value,
    }));
    setError(null);
    setSuccess(null);
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    const parsedPayload = clientMutationRequestSchema.safeParse(
      getClientPayload(values, canManageClientControls),
    );

    if (!parsedPayload.success) {
      setError(
        parsedPayload.error.issues[0]?.message ?? "Invalid client payload.",
      );
      return;
    }

    createClientMutation.mutate(parsedPayload.data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Add client</DialogTitle>
          <DialogDescription>
            Create the account record recruiters will attach jobs, contacts,
            and pipeline work to.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-5" onSubmit={handleSubmit}>
          <div className="rounded-[1.65rem] border border-border/70 bg-workspace-muted-surface/45 p-4">
            <div className="flex items-start gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-[1.05rem] border border-border/70 bg-background/72">
                <Sparkles className="size-4 text-muted-foreground" />
              </span>
              <div>
                <p className="text-sm font-medium text-foreground">
                  Client baseline
                </p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  Keep this quick: enough detail for ownership and filtering,
                  then deepen contacts and jobs from the client detail flow.
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-2 lg:col-span-2">
              <Label htmlFor="client-create-name">Client name</Label>
              <Input
                id="client-create-name"
                placeholder="Acme Robotics"
                required
                value={values.name}
                onChange={(event) => {
                  updateValue("name", event.target.value);
                }}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="client-create-industry">Industry</Label>
              <Input
                id="client-create-industry"
                placeholder="Industrial automation"
                value={values.industry}
                onChange={(event) => {
                  updateValue("industry", event.target.value);
                }}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="client-create-website">Website</Label>
              <Input
                id="client-create-website"
                placeholder="acme.example"
                value={values.website}
                onChange={(event) => {
                  updateValue("website", event.target.value);
                }}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="client-create-location">HQ location</Label>
              <Input
                id="client-create-location"
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
                    placeholder="Default to me"
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
                  Management fields are locked for coordinators.
                </p>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">
                  This client will be created as active, medium priority, and
                  assigned to you by the API.
                </p>
              </div>
            )}

            <div className="space-y-2 lg:col-span-2">
              <Label htmlFor="client-create-notes">Notes preview</Label>
              <textarea
                id="client-create-notes"
                className="input min-h-28 resize-y py-3"
                placeholder="Hiring appetite, relationship context, or the next thing the team should know."
                value={values.notesPreview}
                onChange={(event) => {
                  updateValue("notesPreview", event.target.value);
                }}
              />
            </div>
          </div>

          {error ? <p className="status-message status-error">{error}</p> : null}
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
              disabled={createClientMutation.isPending}
            >
              {createClientMutation.isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="size-4" />
                  Create client
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export { ClientCreateDialog };
