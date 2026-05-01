"use client";

import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { TrackedLink } from "@/components/navigation/TrackedLink";

import type {
  ContactFormState,
  ContactFormValues,
} from "../actions";
import { useContactFormState } from "./hooks/useContactFormState";

export { emptyContactFormValues } from "./hooks/useContactFormState";

type ContactFormAction = (
  previousState: ContactFormState,
  formData: FormData,
) => Promise<ContactFormState>;

type ContactFormProps = {
  action: ContactFormAction;
  clientId: string;
  contactId?: string;
  initialValues: ContactFormValues;
  mode: "create" | "edit";
};

export const ContactForm = ({
  action,
  clientId,
  contactId,
  initialValues,
  mode,
}: ContactFormProps) => {
  const { formAction, isPending, state, values } = useContactFormState({
    action,
    initialValues,
  });

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="clientId" value={clientId} />
      {contactId ? (
        <input type="hidden" name="contactId" value={contactId} />
      ) : null}

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-2 lg:col-span-2">
          <Label htmlFor="fullName">Contact name</Label>
          <Input
            id="fullName"
            name="fullName"
            placeholder="Jordan Lee"
            defaultValue={values.fullName}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            name="title"
            placeholder="VP of Talent"
            defaultValue={values.title}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="relationshipType">Relationship type</Label>
          <Input
            id="relationshipType"
            name="relationshipType"
            placeholder="hiring_manager"
            defaultValue={values.relationshipType}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="jordan@example.com"
            defaultValue={values.email}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            name="phone"
            placeholder="+1 555 0100"
            defaultValue={values.phone}
          />
        </div>

        <div className="space-y-2 lg:col-span-2">
          <Label htmlFor="linkedinUrl">LinkedIn URL</Label>
          <Input
            id="linkedinUrl"
            name="linkedinUrl"
            placeholder="linkedin.com/in/jordanlee"
            defaultValue={values.linkedinUrl}
          />
          <p className="text-xs leading-5 text-muted-foreground">
            URLs without a protocol are normalized to https before they reach
            the API.
          </p>
        </div>

        <label className="flex items-start gap-3 rounded-[1.25rem] border border-border/70 bg-surface-1/70 p-4 lg:col-span-2">
          <input
            className="mt-1 size-4 accent-foreground"
            defaultChecked={values.isPrimary}
            name="isPrimary"
            type="checkbox"
          />
          <span>
            <span className="block text-sm font-medium text-foreground">
              Mark as primary contact
            </span>
            <span className="mt-1 block text-xs leading-5 text-muted-foreground">
              The API will clear the previous primary contact for this client
              so the detail page has a single best handoff person.
            </span>
          </span>
        </label>
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
            "Create contact"
          ) : (
            "Save contact"
          )}
        </Button>
        <Button asChild type="button" variant="outline" className="rounded-full">
          <TrackedLink href={`/clients/${clientId}`}>Cancel</TrackedLink>
        </Button>
      </div>
    </form>
  );
};
