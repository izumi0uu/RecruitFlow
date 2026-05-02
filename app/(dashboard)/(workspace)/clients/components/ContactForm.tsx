"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { TrackedLink } from "@/components/navigation/TrackedLink";

export type ContactFormValues = {
  email: string;
  fullName: string;
  isPrimary: boolean;
  linkedinUrl: string;
  phone: string;
  relationshipType: string;
  title: string;
};

type ContactFormProps = {
  clientId: string;
  error?: string | null;
  footerClassName?: string;
  idPrefix?: string;
  initialValues: ContactFormValues;
  isPending: boolean;
  mode: "create" | "edit";
  onSubmit: (values: ContactFormValues) => void;
  onValuesChange?: () => void;
  pendingContent?: React.ReactNode;
  secondaryAction?: React.ReactNode;
  submitContent?: React.ReactNode;
  success?: string | null;
};

export const emptyContactFormValues: ContactFormValues = {
  email: "",
  fullName: "",
  isPrimary: false,
  linkedinUrl: "",
  phone: "",
  relationshipType: "",
  title: "",
};

export const ContactForm = ({
  clientId,
  error,
  footerClassName = "flex flex-wrap items-center gap-3",
  idPrefix = "contact",
  initialValues,
  isPending,
  mode,
  onSubmit,
  onValuesChange,
  pendingContent,
  secondaryAction,
  submitContent,
  success,
}: ContactFormProps) => {
  const [values, setValues] = React.useState<ContactFormValues>({
    ...emptyContactFormValues,
    ...initialValues,
  });

  React.useEffect(() => {
    setValues({
      ...emptyContactFormValues,
      ...initialValues,
    });
  }, [initialValues]);

  const updateValue = React.useCallback(
    (name: keyof ContactFormValues, value: string | boolean) => {
      setValues((currentValues) => ({
        ...currentValues,
        [name]: value,
      }));
      onValuesChange?.();
    },
    [onValuesChange],
  );
  const fieldId = React.useCallback(
    (name: keyof ContactFormValues) => `${idPrefix}-${name}`,
    [idPrefix],
  );

  return (
    <form
      className="space-y-6"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(values);
      }}
    >
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-2 lg:col-span-2">
          <Label htmlFor={fieldId("fullName")}>Contact name</Label>
          <Input
            id={fieldId("fullName")}
            name="fullName"
            placeholder="Jordan Lee"
            required
            value={values.fullName}
            onChange={(event) => {
              updateValue("fullName", event.target.value);
            }}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor={fieldId("title")}>Title</Label>
          <Input
            id={fieldId("title")}
            name="title"
            placeholder="VP of Talent"
            value={values.title}
            onChange={(event) => {
              updateValue("title", event.target.value);
            }}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor={fieldId("relationshipType")}>
            Relationship type
          </Label>
          <Input
            id={fieldId("relationshipType")}
            name="relationshipType"
            placeholder="hiring_manager"
            value={values.relationshipType}
            onChange={(event) => {
              updateValue("relationshipType", event.target.value);
            }}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor={fieldId("email")}>Email</Label>
          <Input
            id={fieldId("email")}
            name="email"
            type="email"
            placeholder="jordan@example.com"
            value={values.email}
            onChange={(event) => {
              updateValue("email", event.target.value);
            }}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor={fieldId("phone")}>Phone</Label>
          <Input
            id={fieldId("phone")}
            name="phone"
            placeholder="+1 555 0100"
            value={values.phone}
            onChange={(event) => {
              updateValue("phone", event.target.value);
            }}
          />
        </div>

        <div className="space-y-2 lg:col-span-2">
          <Label htmlFor={fieldId("linkedinUrl")}>LinkedIn URL</Label>
          <Input
            id={fieldId("linkedinUrl")}
            name="linkedinUrl"
            placeholder="linkedin.com/in/jordanlee"
            value={values.linkedinUrl}
            onChange={(event) => {
              updateValue("linkedinUrl", event.target.value);
            }}
          />
          <p className="text-xs leading-5 text-muted-foreground">
            URLs without a protocol are normalized to https before they reach
            the API.
          </p>
        </div>

        <label className="flex items-start gap-3 rounded-[1.25rem] border border-border/70 bg-surface-1/70 p-4 lg:col-span-2">
          <input
            checked={values.isPrimary}
            className="mt-1 size-4 accent-foreground"
            name="isPrimary"
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
              The API will clear the previous primary contact for this client
              so the detail page has a single best handoff person.
            </span>
          </span>
        </label>
      </div>

      {error ? <p className="status-message status-error">{error}</p> : null}
      {success ? (
        <p className="status-message status-success">{success}</p>
      ) : null}

      <div className={footerClassName}>
        <Button type="submit" className="rounded-full" disabled={isPending}>
          {isPending ? (
            pendingContent ?? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Saving...
              </>
            )
          ) : (
            submitContent ?? (
              <>
                {mode === "create" ? "Create contact" : "Save contact"}
              </>
            )
          )}
        </Button>
        {secondaryAction ?? (
          <Button
            asChild
            type="button"
            variant="outline"
            className="rounded-full"
          >
            <TrackedLink href={`/clients/${clientId}`}>Cancel</TrackedLink>
          </Button>
        )}
      </div>
    </form>
  );
};
