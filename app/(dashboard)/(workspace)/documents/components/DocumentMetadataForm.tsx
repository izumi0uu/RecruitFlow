"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";

import {
  apiDocumentTypeValues,
  type ApiDocumentEntityType,
  type ApiDocumentType,
} from "@recruitflow/contracts";

import { TrackedLink } from "@/components/navigation/TrackedLink";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";

import type {
  DocumentMetadataFormState,
  DocumentMetadataFormValues,
} from "../actions";

type DocumentMetadataFormAction = (
  previousState: DocumentMetadataFormState,
  formData: FormData,
) => Promise<DocumentMetadataFormState>;

type DocumentMetadataFormProps = {
  action: DocumentMetadataFormAction;
  cancelHref: string;
  initialValues: DocumentMetadataFormValues;
};

const entityTypeOptions = [
  { label: "Candidate", value: "candidate" },
  { label: "Job", value: "job" },
] as const satisfies ReadonlyArray<{
  label: string;
  value: ApiDocumentEntityType;
}>;

const documentTypeLabelMap: Record<ApiDocumentType, string> = {
  call_note: "Call note",
  interview_note: "Interview note",
  jd: "Job description",
  resume: "Resume",
};

export const emptyDocumentMetadataFormValues: DocumentMetadataFormValues = {
  entityId: "",
  entityType: "",
  mimeType: "application/pdf",
  sizeBytes: "",
  sourceFilename: "",
  storageKey: "",
  title: "",
  type: "",
};

export const buildDocumentMetadataFormValues = (
  values: Partial<DocumentMetadataFormValues>,
): DocumentMetadataFormValues => ({
  ...emptyDocumentMetadataFormValues,
  ...values,
});

export const DocumentMetadataForm = ({
  action,
  cancelHref,
  initialValues,
}: DocumentMetadataFormProps) => {
  const [state, formAction, isPending] = useActionState<
    DocumentMetadataFormState,
    FormData
  >(action, {});
  const values = {
    ...initialValues,
    ...(state.values ?? {}),
  };

  return (
    <form action={formAction} className="space-y-6">
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="entityType">Linked entity type</Label>
          <select
            id="entityType"
            className="input"
            name="entityType"
            defaultValue={values.entityType}
            required
          >
            <option value="" disabled>
              Select entity type
            </option>
            {entityTypeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="entityId">Linked entity id</Label>
          <Input
            id="entityId"
            name="entityId"
            placeholder="Candidate or job UUID"
            defaultValue={values.entityId}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="type">Document type</Label>
          <select
            id="type"
            className="input"
            name="type"
            defaultValue={values.type}
            required
          >
            <option value="" disabled>
              Select document type
            </option>
            {apiDocumentTypeValues.map((type) => (
              <option key={type} value={type}>
                {documentTypeLabelMap[type]}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="title">Document title</Label>
          <Input
            id="title"
            name="title"
            placeholder="Nina Patel Resume"
            defaultValue={values.title}
            required
          />
        </div>

        <div className="space-y-2 lg:col-span-2">
          <Label htmlFor="storageKey">Storage key</Label>
          <Input
            id="storageKey"
            name="storageKey"
            placeholder="workspace/candidates/nina-patel-resume.pdf"
            defaultValue={values.storageKey}
            required
          />
          <p className="text-xs leading-5 text-muted-foreground">
            RF-35 stores metadata only. This key represents where the uploaded
            file is or will be stored once real storage transport lands.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="sourceFilename">Source filename</Label>
          <Input
            id="sourceFilename"
            name="sourceFilename"
            placeholder="nina-patel-resume.pdf"
            defaultValue={values.sourceFilename}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="mimeType">MIME type</Label>
          <Input
            id="mimeType"
            name="mimeType"
            placeholder="application/pdf"
            defaultValue={values.mimeType}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="sizeBytes">Size bytes</Label>
          <Input
            id="sizeBytes"
            name="sizeBytes"
            type="number"
            min="0"
            inputMode="numeric"
            placeholder="132000"
            defaultValue={values.sizeBytes}
          />
        </div>
      </div>

      {state.error ? (
        <p className="status-message status-error">{state.error}</p>
      ) : null}

      <p className="status-message border-border/70 bg-surface-1/70 text-muted-foreground">
        This is a non-destructive metadata registration flow. File deletion,
        document archive, and destructive storage operations are intentionally
        not exposed in this candidate/document slice.
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" className="rounded-full" disabled={isPending}>
          {isPending ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Saving...
            </>
          ) : (
            "Save document metadata"
          )}
        </Button>
        <Button asChild type="button" variant="outline" className="rounded-full">
          <TrackedLink href={cancelHref}>Cancel</TrackedLink>
        </Button>
      </div>
    </form>
  );
};
