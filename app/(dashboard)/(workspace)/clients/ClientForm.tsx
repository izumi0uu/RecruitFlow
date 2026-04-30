"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";

import {
  apiClientEditableStatusValues,
  apiClientPriorityValues,
  type ApiClientEditableStatus,
  type ApiClientPriority,
  type ClientsListOwnerOption,
} from "@recruitflow/contracts";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { TrackedLink } from "@/components/navigation/TrackedLink";

import type {
  ClientFormState,
  ClientFormValues,
} from "./actions";

type ClientFormAction = (
  previousState: ClientFormState,
  formData: FormData,
) => Promise<ClientFormState>;

type ClientFormProps = {
  action: ClientFormAction;
  canManageClientControls?: boolean;
  clientId?: string;
  initialValues: ClientFormValues;
  mode: "create" | "edit";
  ownerOptions: ClientsListOwnerOption[];
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

export const emptyClientFormValues: ClientFormValues = {
  hqLocation: "",
  industry: "",
  name: "",
  notesPreview: "",
  ownerUserId: "",
  priority: "medium",
  status: "active",
  website: "",
};

export const ClientForm = ({
  action,
  canManageClientControls = true,
  clientId,
  initialValues,
  mode,
  ownerOptions,
}: ClientFormProps) => {
  const [state, formAction, isPending] = useActionState<
    ClientFormState,
    FormData
  >(action, {});
  const values = {
    ...emptyClientFormValues,
    ...initialValues,
    ...(state.values ?? {}),
  };

  return (
    <form action={formAction} className="space-y-6">
      {clientId ? (
        <input type="hidden" name="clientId" value={clientId} />
      ) : null}

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-2 lg:col-span-2">
          <Label htmlFor="name">Client name</Label>
          <Input
            id="name"
            name="name"
            placeholder="Acme Robotics"
            defaultValue={values.name}
            required
          />
          <p className="text-xs leading-5 text-muted-foreground">
            Use the company name the recruiting team will recognize in job
            intake and pipeline handoffs.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="industry">Industry</Label>
          <Input
            id="industry"
            name="industry"
            placeholder="Industrial automation"
            defaultValue={values.industry}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="website">Website</Label>
          <Input
            id="website"
            name="website"
            placeholder="acme.example"
            defaultValue={values.website}
          />
          <p className="text-xs leading-5 text-muted-foreground">
            URLs without a protocol are normalized to https before they reach
            the API.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="hqLocation">HQ location</Label>
          <Input
            id="hqLocation"
            name="hqLocation"
            placeholder="Austin, TX"
            defaultValue={values.hqLocation}
          />
        </div>

        {canManageClientControls ? (
          <>
            <div className="space-y-2">
              <Label htmlFor="ownerUserId">Client owner</Label>
              <select
                id="ownerUserId"
                className="input"
                name="ownerUserId"
                defaultValue={values.ownerUserId}
                required
              >
                <option value="" disabled>
                  Select owner
                </option>
                {ownerOptions.map((owner) => (
                  <option key={owner.id} value={owner.id}>
                    {owner.name ?? owner.email}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <select
                id="status"
                className="input"
                name="status"
                defaultValue={values.status}
                required
              >
                {apiClientEditableStatusValues.map((status) => (
                  <option key={status} value={status}>
                    {statusLabelMap[status]}
                  </option>
                ))}
              </select>
              <p className="text-xs leading-5 text-muted-foreground">
                Archived is intentionally absent here; use the dedicated
                archive control on the client detail page for that destructive
                workflow.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <select
                id="priority"
                className="input"
                name="priority"
                defaultValue={values.priority}
                required
              >
                {apiClientPriorityValues.map((priority) => (
                  <option key={priority} value={priority}>
                    {priorityLabelMap[priority]}
                  </option>
                ))}
              </select>
            </div>
          </>
        ) : (
          <div className="rounded-[1.35rem] border border-border/70 bg-surface-1/70 p-4 lg:col-span-2">
            <input type="hidden" name="ownerUserId" value={values.ownerUserId} />
            <input type="hidden" name="status" value={values.status} />
            <input type="hidden" name="priority" value={values.priority} />
            <p className="text-sm font-medium text-foreground">
              Owner, status, and priority are locked for coordinators.
            </p>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              Coordinators can keep descriptive baseline data complete, while
              owner/recruiter users control account management fields and
              archive actions.
            </p>
          </div>
        )}

        <div className="space-y-2 lg:col-span-2">
          <Label htmlFor="notesPreview">Notes preview</Label>
          <textarea
            id="notesPreview"
            className="input min-h-32 resize-y py-3"
            name="notesPreview"
            placeholder="Key relationship context, current hiring appetite, or the next thing a recruiter should know."
            defaultValue={values.notesPreview}
          />
        </div>
      </div>

      {state.error ? (
        <p className="status-message status-error">{state.error}</p>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" className="rounded-full" disabled={isPending}>
          {isPending ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Saving...
            </>
          ) : mode === "create" ? (
            "Create client"
          ) : (
            "Save client"
          )}
        </Button>
        <Button asChild type="button" variant="outline" className="rounded-full">
          <TrackedLink href="/clients">Cancel</TrackedLink>
        </Button>
      </div>
    </form>
  );
};
