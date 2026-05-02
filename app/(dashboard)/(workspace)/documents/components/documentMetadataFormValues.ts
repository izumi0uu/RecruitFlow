import type {
  ApiDocumentEntityType,
  ApiDocumentType,
} from "@recruitflow/contracts";

export type DocumentMetadataFormValues = {
  entityId: string;
  entityType: ApiDocumentEntityType | "";
  mimeType: string;
  sizeBytes: string;
  sourceFilename: string;
  storageKey: string;
  title: string;
  type: ApiDocumentType | "";
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
