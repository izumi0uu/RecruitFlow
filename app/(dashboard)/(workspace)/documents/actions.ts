"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  documentMutationRequestSchema,
  type ApiDocumentEntityType,
  type ApiDocumentType,
  type DocumentMutationResponse,
} from "@recruitflow/contracts";

import { isApiRequestError, requestApiJson } from "@/lib/api/client";

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

export type DocumentMetadataFormState = {
  error?: string;
  values?: DocumentMetadataFormValues;
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

const getDocumentMetadataPayload = (values: DocumentMetadataFormValues) => ({
  entityId: values.entityId,
  entityType: values.entityType,
  mimeType: values.mimeType,
  sizeBytes: values.sizeBytes,
  sourceFilename: values.sourceFilename,
  storageKey: values.storageKey,
  title: values.title,
  type: values.type,
});

const getDocumentRedirectPath = (document: DocumentMutationResponse) => {
  if (document.document.entityType === "candidate") {
    return `/candidates/${document.document.entityId}?documentCreated=1`;
  }

  if (document.document.entityType === "job") {
    return `/jobs/${document.document.entityId}`;
  }

  return "/documents";
};

const parseDocumentMetadataForm = (formData: FormData) => {
  const values = getDocumentMetadataFormValues(formData);
  const parsedPayload = documentMutationRequestSchema.safeParse(
    getDocumentMetadataPayload(values),
  );

  if (!parsedPayload.success) {
    return {
      error:
        parsedPayload.error.issues[0]?.message ??
        "Invalid document metadata form",
      values,
    };
  }

  return {
    data: parsedPayload.data,
    values,
  };
};

const toActionError = (
  error: unknown,
  values: DocumentMetadataFormValues,
) => {
  if (isApiRequestError(error)) {
    if (error.status === 401) {
      redirect("/sign-in");
    }

    if (error.status === 403) {
      return {
        error:
          "Only workspace members with coordinator access or higher can register document metadata.",
        values,
      };
    }

    if (error.status === 404) {
      return {
        error:
          "The linked entity was not found in this workspace. Check the entity type and id.",
        values,
      };
    }

    return {
      error: error.message,
      values,
    };
  }

  throw error;
};

export const createDocumentMetadataAction = async (
  _previousState: DocumentMetadataFormState,
  formData: FormData,
): Promise<DocumentMetadataFormState> => {
  const parsedForm = parseDocumentMetadataForm(formData);

  if ("error" in parsedForm) {
    return parsedForm;
  }

  let createdDocument: DocumentMutationResponse;

  try {
    createdDocument = await requestApiJson<DocumentMutationResponse>(
      "/documents",
      {
        method: "POST",
        json: parsedForm.data,
      },
    );
  } catch (error) {
    return toActionError(error, parsedForm.values);
  }

  revalidatePath("/documents");
  revalidatePath(`/${createdDocument.document.entityType}s`);

  if (createdDocument.document.entityType === "candidate") {
    revalidatePath(`/candidates/${createdDocument.document.entityId}`);
  }

  if (createdDocument.document.entityType === "job") {
    revalidatePath(`/jobs/${createdDocument.document.entityId}`);
  }

  redirect(getDocumentRedirectPath(createdDocument));
};
