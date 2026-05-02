"use client";

import { DocumentMetadataForm } from "./DocumentMetadataForm";
import type { DocumentMetadataFormValues } from "./documentMetadataFormValues";
import { useDocumentMetadataMutation } from "./hooks/useDocumentMutations";

type DocumentMetadataFormControllerProps = {
  cancelHref: string;
  initialValues: DocumentMetadataFormValues;
};

export const DocumentMetadataFormController = ({
  cancelHref,
  initialValues,
}: DocumentMetadataFormControllerProps) => {
  const { error, isPending, saveDocumentMetadata } =
    useDocumentMetadataMutation();

  return (
    <DocumentMetadataForm
      cancelHref={cancelHref}
      error={error}
      initialValues={initialValues}
      isPending={isPending}
      onSubmit={saveDocumentMetadata}
    />
  );
};
