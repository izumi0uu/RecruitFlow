"use client";

import * as React from "react";
import { useMutation } from "@tanstack/react-query";
import { ContactRound, Loader2, Plus } from "lucide-react";

import {
  clientContactMutationRequestSchema,
  type ClientContactMutationRequest,
  type ClientContactMutationResponse,
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
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";

type ClientContactCreateDialogProps = {
  clientId: string;
  clientName: string;
  defaultIsPrimary: boolean;
  onContactCreated: (contact: ClientContactMutationResponse) => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
};

type ContactCreateValues = {
  email: string;
  fullName: string;
  isPrimary: boolean;
  linkedinUrl: string;
  phone: string;
  relationshipType: string;
  title: string;
};

type ApiErrorBody = {
  error?: string;
  message?: string | string[];
};

const getEmptyValues = (defaultIsPrimary: boolean): ContactCreateValues => ({
  email: "",
  fullName: "",
  isPrimary: defaultIsPrimary,
  linkedinUrl: "",
  phone: "",
  relationshipType: "",
  title: "",
});

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

const createClientContact = async ({
  clientId,
  payload,
}: {
  clientId: string;
  payload: ClientContactMutationRequest;
}) => {
  const response = await fetch(`/api/clients/${clientId}/contacts`, {
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

  return body as ClientContactMutationResponse;
};

const ClientContactCreateDialog = ({
  clientId,
  clientName,
  defaultIsPrimary,
  onContactCreated,
  onOpenChange,
  open,
}: ClientContactCreateDialogProps) => {
  const [values, setValues] = React.useState<ContactCreateValues>(
    getEmptyValues(defaultIsPrimary),
  );
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);
  const createContactMutation = useMutation({
    mutationFn: createClientContact,
    onError: (caughtError) => {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to create contact.",
      );
    },
    onSuccess: (createdContact) => {
      setValues(getEmptyValues(false));
      setSuccess(createdContact.message);
      onContactCreated(createdContact);
    },
  });

  React.useEffect(() => {
    if (!open) {
      return;
    }

    setValues(getEmptyValues(defaultIsPrimary));
    setError(null);
    setSuccess(null);
  }, [defaultIsPrimary, open]);

  const updateValue = (
    name: keyof ContactCreateValues,
    value: string | boolean,
  ) => {
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

    const parsedPayload = clientContactMutationRequestSchema.safeParse(values);

    if (!parsedPayload.success) {
      setError(
        parsedPayload.error.issues[0]?.message ??
          "Invalid client contact payload.",
      );
      return;
    }

    createContactMutation.mutate({
      clientId,
      payload: parsedPayload.data,
    });
  };

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

        <form className="space-y-5" onSubmit={handleSubmit}>
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

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-2 lg:col-span-2">
              <Label htmlFor="contact-create-fullName">Contact name</Label>
              <Input
                id="contact-create-fullName"
                placeholder="Jordan Lee"
                required
                value={values.fullName}
                onChange={(event) => {
                  updateValue("fullName", event.target.value);
                }}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contact-create-title">Title</Label>
              <Input
                id="contact-create-title"
                placeholder="VP of Talent"
                value={values.title}
                onChange={(event) => {
                  updateValue("title", event.target.value);
                }}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contact-create-relationshipType">
                Relationship type
              </Label>
              <Input
                id="contact-create-relationshipType"
                placeholder="hiring_manager"
                value={values.relationshipType}
                onChange={(event) => {
                  updateValue("relationshipType", event.target.value);
                }}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contact-create-email">Email</Label>
              <Input
                id="contact-create-email"
                type="email"
                placeholder="jordan@example.com"
                value={values.email}
                onChange={(event) => {
                  updateValue("email", event.target.value);
                }}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contact-create-phone">Phone</Label>
              <Input
                id="contact-create-phone"
                placeholder="+1 555 0100"
                value={values.phone}
                onChange={(event) => {
                  updateValue("phone", event.target.value);
                }}
              />
            </div>

            <div className="space-y-2 lg:col-span-2">
              <Label htmlFor="contact-create-linkedinUrl">LinkedIn URL</Label>
              <Input
                id="contact-create-linkedinUrl"
                placeholder="linkedin.com/in/jordanlee"
                value={values.linkedinUrl}
                onChange={(event) => {
                  updateValue("linkedinUrl", event.target.value);
                }}
              />
            </div>

            <label className="flex cursor-pointer items-start gap-3 rounded-[1.25rem] border border-border/70 bg-surface-1/70 p-4 lg:col-span-2">
              <input
                className="mt-1 size-4 cursor-pointer accent-foreground"
                checked={values.isPrimary}
                type="checkbox"
                onChange={(event) => {
                  updateValue("isPrimary", event.target.checked);
                }}
              />
              <span>
                <span className="block text-sm font-medium text-foreground">
                  Mark as primary contact
                </span>
                <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                  The API will clear the previous primary contact for this
                  client so the detail page has one best handoff person.
                </span>
              </span>
            </label>
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
              disabled={createContactMutation.isPending}
            >
              {createContactMutation.isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="size-4" />
                  Create contact
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export { ClientContactCreateDialog };
