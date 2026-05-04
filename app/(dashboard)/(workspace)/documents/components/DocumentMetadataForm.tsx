"use client";

import {
  type ApiDocumentEntityType,
  type ApiDocumentType,
  apiDocumentTypeValues,
} from "@recruitflow/contracts";
import { Loader2 } from "lucide-react";
import { type FormEvent, useState } from "react";

import { TrackedLink } from "@/components/navigation/TrackedLink";
import { Button } from "@/components/ui/Button";
import { FilterSelect } from "@/components/ui/FilterSelect";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";

import type { DocumentMetadataFormValues } from "./documentMetadataFormValues";

type DocumentMetadataFormProps = {
  cancelHref: string;
  error?: string | null;
  initialValues: DocumentMetadataFormValues;
  isPending: boolean;
  onSubmit: (values: DocumentMetadataFormValues) => void;
};

type DocumentSelectValues = Pick<
  DocumentMetadataFormValues,
  "entityType" | "type"
>;

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

const getString = (value: FormDataEntryValue | null) =>
  typeof value === "string" ? value : "";

const getDocumentMetadataFormValues = (
  formData: FormData,
): DocumentMetadataFormValues => ({
  entityId: getString(formData.get("entityId")),
  entityType: getString(formData.get("entityType")) as
    | ApiDocumentEntityType
    | "",
  mimeType: getString(formData.get("mimeType")),
  sizeBytes: getString(formData.get("sizeBytes")),
  sourceFilename: getString(formData.get("sourceFilename")),
  storageKey: getString(formData.get("storageKey")),
  title: getString(formData.get("title")),
  type: getString(formData.get("type")) as ApiDocumentType | "",
});

export const DocumentMetadataForm = ({
  cancelHref,
  error,
  initialValues,
  isPending,
  onSubmit,
}: DocumentMetadataFormProps) => {
  const values = initialValues;
  const [selectValues, setSelectValues] = useState<DocumentSelectValues>({
    entityType: values.entityType,
    type: values.type,
  });
  const canSubmit = Object.values(selectValues).every(Boolean);
  const updateSelectValue =
    (field: keyof DocumentSelectValues) => (value: string) => {
      setSelectValues(
        (currentValues) =>
          ({
            ...currentValues,
            [field]: value,
          }) as DocumentSelectValues,
      );
    };
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!canSubmit) {
      return;
    }

    onSubmit(getDocumentMetadataFormValues(new FormData(event.currentTarget)));
  };
  const documentTypeOptions = apiDocumentTypeValues.map((type) => ({
    label: documentTypeLabelMap[type],
    value: type,
  }));

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="entityType">Linked entity type</Label>
          <FilterSelect
            id="entityType"
            name="entityType"
            onValueChange={updateSelectValue("entityType")}
            options={entityTypeOptions}
            placeholder="Select entity type"
            value={selectValues.entityType}
          />
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
          <FilterSelect
            id="type"
            name="type"
            onValueChange={updateSelectValue("type")}
            options={documentTypeOptions}
            placeholder="Select document type"
            value={selectValues.type}
          />
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
            This internal key is used only by the API delivery boundary. It is
            not shown on list/detail surfaces and represents where the file is
            or will be stored once real storage transport lands.
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

      {error ? <p className="status-message status-error">{error}</p> : null}

      <p className="status-message border-border/70 bg-surface-1/70 text-muted-foreground">
        This is a non-destructive metadata registration flow. Resolvable files
        can be downloaded through the API-owned delivery boundary; unresolved
        keys show a controlled unavailable state until real storage exists.
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="submit"
          className="rounded-full"
          disabled={isPending || !canSubmit}
        >
          {isPending ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Saving...
            </>
          ) : (
            "Save document metadata"
          )}
        </Button>
        <Button
          asChild
          type="button"
          variant="outline"
          className="rounded-full"
        >
          <TrackedLink href={cancelHref}>Cancel</TrackedLink>
        </Button>
      </div>
    </form>
  );
};
