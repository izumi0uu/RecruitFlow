"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import {
  documentMutationRequestSchema,
  type DocumentMutationResponse,
} from "@recruitflow/contracts";

import {
  candidatesListRootQueryKey,
  documentsListRootQueryKey,
} from "@/lib/query/options";

import type { DocumentMetadataFormValues } from "../DocumentMetadataForm";

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

const getDocumentMutationErrorMessage = async (response: Response) => {
  try {
    const body = (await response.json()) as { error?: string };

    if (body.error) {
      return body.error;
    }
  } catch {
    // Use the fallback when the BFF cannot produce JSON.
  }

  return `Document metadata save failed with status ${response.status}`;
};

const requestDocumentMutation = async (
  values: DocumentMetadataFormValues,
) => {
  const parsedPayload = documentMutationRequestSchema.safeParse(
    getDocumentMetadataPayload(values),
  );

  if (!parsedPayload.success) {
    throw new Error(
      parsedPayload.error.issues[0]?.message ??
        "Invalid document metadata form",
    );
  }

  const response = await fetch("/api/documents", {
    body: JSON.stringify(parsedPayload.data),
    headers: {
      "content-type": "application/json",
    },
    method: "POST",
  });

  if (response.status === 401) {
    throw new Error("UNAUTHENTICATED");
  }

  if (!response.ok) {
    throw new Error(await getDocumentMutationErrorMessage(response));
  }

  return (await response.json()) as DocumentMutationResponse;
};

export const useDocumentMetadataMutation = () => {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const mutation = useMutation({
    mutationFn: requestDocumentMutation,
    onMutate: () => {
      setError(null);
    },
    onSuccess: async (response) => {
      queryClient.removeQueries({
        queryKey: documentsListRootQueryKey,
        type: "inactive",
      });
      queryClient.removeQueries({
        queryKey: candidatesListRootQueryKey,
        type: "inactive",
      });
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: documentsListRootQueryKey,
          refetchType: "active",
        }),
        queryClient.invalidateQueries({
          queryKey: candidatesListRootQueryKey,
          refetchType: "active",
        }),
      ]);

      router.push(getDocumentRedirectPath(response));
    },
    onError: (mutationError) => {
      if (
        mutationError instanceof Error &&
        mutationError.message === "UNAUTHENTICATED"
      ) {
        router.push("/sign-in");
        return;
      }

      setError(
        mutationError instanceof Error
          ? mutationError.message
          : "Unable to save document metadata.",
      );
    },
  });

  return {
    error,
    isPending: mutation.isPending,
    saveDocumentMetadata: mutation.mutate,
  };
};
