"use client";

import { useCallback, useState } from "react";
import {
  useMutation,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";

import type {
  ClientArchiveResponse,
  ClientRestoreResponse,
} from "@recruitflow/contracts";

import {
  clientsListMutationMarkerQueryKey,
  clientsListRootQueryKey,
} from "@/lib/query/options";

type ClientLifecycleAction = "archive" | "restore";

type ClientLifecycleMutationOptions<TResponse> = {
  onSuccess?: (response: TResponse) => Promise<void> | void;
};

const actionLabelMap: Record<ClientLifecycleAction, string> = {
  archive: "Archive",
  restore: "Restore",
};

const getClientLifecycleErrorMessage = async (
  response: Response,
  action: ClientLifecycleAction,
) => {
  try {
    const body = (await response.json()) as { error?: string };

    if (body.error) {
      return body.error;
    }
  } catch {
    // Use the fallback if the BFF does not return JSON.
  }

  return `${actionLabelMap[action]} failed with status ${response.status}`;
};

const requestClientLifecycleMutation = async <TResponse,>(
  clientId: string,
  action: ClientLifecycleAction,
) => {
  const response = await fetch(`/api/clients/${clientId}/${action}`, {
    method: "PATCH",
  });

  if (!response.ok) {
    throw new Error(await getClientLifecycleErrorMessage(response, action));
  }

  return (await response.json()) as TResponse;
};

const markClientsListMutation = (queryClient: QueryClient) => {
  queryClient.setQueryData(clientsListMutationMarkerQueryKey, Date.now());
};

export const useClientsListMutationState = () => {
  const queryClient = useQueryClient();
  const [hasClientListMutation, setHasClientListMutation] = useState(
    () =>
      queryClient.getQueryData(clientsListMutationMarkerQueryKey) !==
      undefined,
  );

  const markMutation = useCallback(() => {
    markClientsListMutation(queryClient);
    setHasClientListMutation(true);
  }, [queryClient]);

  const clearClientsListCache = useCallback(() => {
    markMutation();
    queryClient.removeQueries({
      queryKey: clientsListRootQueryKey,
    });
  }, [markMutation, queryClient]);

  const refreshClientsListCache = useCallback(async () => {
    markMutation();
    queryClient.removeQueries({
      queryKey: clientsListRootQueryKey,
      type: "inactive",
    });
    await queryClient.invalidateQueries({
      queryKey: clientsListRootQueryKey,
      refetchType: "active",
    });
  }, [markMutation, queryClient]);

  return {
    clearClientsListCache,
    hasClientListMutation,
    refreshClientsListCache,
  };
};

export const useClientArchiveMutation = ({
  onSuccess,
}: ClientLifecycleMutationOptions<ClientArchiveResponse> = {}) => {
  const [error, setError] = useState<string | null>(null);
  const mutation = useMutation({
    mutationFn: (clientId: string) =>
      requestClientLifecycleMutation<ClientArchiveResponse>(
        clientId,
        "archive",
      ),
    onMutate: () => {
      setError(null);
    },
    onSuccess: async (response) => {
      await onSuccess?.(response);
    },
    onError: (archiveError) => {
      setError(
        archiveError instanceof Error
          ? archiveError.message
          : "Unable to archive client.",
      );
    },
  });

  return {
    archiveClient: mutation.mutate,
    error,
    isPending: mutation.isPending,
  };
};

export const useClientRestoreMutation = ({
  onSuccess,
}: ClientLifecycleMutationOptions<ClientRestoreResponse> = {}) => {
  const [error, setError] = useState<string | null>(null);
  const mutation = useMutation({
    mutationFn: (clientId: string) =>
      requestClientLifecycleMutation<ClientRestoreResponse>(
        clientId,
        "restore",
      ),
    onMutate: () => {
      setError(null);
    },
    onSuccess: async (response) => {
      await onSuccess?.(response);
    },
    onError: (restoreError) => {
      setError(
        restoreError instanceof Error
          ? restoreError.message
          : "Unable to restore client.",
      );
    },
  });

  return {
    error,
    isPending: mutation.isPending,
    restoreClient: mutation.mutate,
    variables: mutation.variables,
  };
};
