"use client";

import { useCallback, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import type {
  ClientArchiveResponse,
  ClientContactMutationRequest,
  ClientContactMutationResponse,
  ClientDetailResponse,
  ClientRestoreResponse,
} from "@recruitflow/contracts";

import { fetchJson } from "@/lib/query/fetcher";
import {
  clientDetailQueryKey,
  clientsListRootQueryKey,
} from "@/lib/query/options";

type ClientLifecycleAction = "archive" | "restore";

type ClientLifecycleMutationOptions<TResponse> = {
  onSuccess?: (response: TResponse) => Promise<void> | void;
};

type ClientContactMutationOptions = {
  clientId: string;
  contactId?: string;
  onSuccess?: (response: ClientContactMutationResponse) => Promise<void> | void;
};

const requestClientLifecycleMutation = async <TResponse,>(
  clientId: string,
  action: ClientLifecycleAction,
) =>
  fetchJson<TResponse>(`/api/clients/${clientId}/${action}`, {
    method: "PATCH",
  });

const requestClientContactMutation = async ({
  clientId,
  contactId,
  method,
  payload,
}: {
  clientId: string;
  contactId?: string;
  method: "PATCH" | "POST";
  payload: ClientContactMutationRequest;
}) =>
  fetchJson<ClientContactMutationResponse>(
    `/api/clients/${clientId}/contacts${contactId ? `/${contactId}` : ""}`,
    {
      body: JSON.stringify(payload),
      headers: {
        accept: "application/json",
        "content-type": "application/json",
      },
      method,
    },
  );

export const useClientsCacheActions = () => {
  const queryClient = useQueryClient();

  const invalidateClientsList = useCallback(async () => {
    await queryClient.invalidateQueries({
      queryKey: clientsListRootQueryKey,
      refetchType: "active",
    });
  }, [queryClient]);

  const removeClientsListCache = useCallback(() => {
    queryClient.removeQueries({
      queryKey: clientsListRootQueryKey,
    });
  }, [queryClient]);

  const setClientDetailCache = useCallback(
    (detail: ClientDetailResponse) => {
      queryClient.setQueryData(clientDetailQueryKey(detail.client.id), detail);
    },
    [queryClient],
  );

  const setClientDetailContactsCache = useCallback(
    (clientId: string, response: ClientContactMutationResponse) => {
      queryClient.setQueryData<ClientDetailResponse>(
        clientDetailQueryKey(clientId),
        (currentDetail) =>
          currentDetail
            ? {
                ...currentDetail,
                contacts: response.contacts,
                context: response.context,
                contractVersion: response.contractVersion,
                workspaceScoped: response.workspaceScoped,
              }
            : currentDetail,
      );
    },
    [queryClient],
  );

  const removeClientDetailCache = useCallback(
    (clientId: string) => {
      queryClient.removeQueries({
        queryKey: clientDetailQueryKey(clientId),
      });
    },
    [queryClient],
  );

  return {
    invalidateClientsList,
    removeClientDetailCache,
    removeClientsListCache,
    setClientDetailCache,
    setClientDetailContactsCache,
  };
};

export const useClientArchiveMutation = ({
  onSuccess,
}: ClientLifecycleMutationOptions<ClientArchiveResponse> = {}) => {
  const {
    invalidateClientsList,
    removeClientDetailCache,
    removeClientsListCache,
  } = useClientsCacheActions();
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
      removeClientDetailCache(response.client.id);
      removeClientsListCache();
      await invalidateClientsList();
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
  const { invalidateClientsList, setClientDetailCache } =
    useClientsCacheActions();
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
      setClientDetailCache(response);
      await invalidateClientsList();
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

export const useClientContactCreateMutation = ({
  clientId,
  onSuccess,
}: ClientContactMutationOptions) => {
  const { invalidateClientsList, setClientDetailContactsCache } =
    useClientsCacheActions();
  const [error, setError] = useState<string | null>(null);
  const mutation = useMutation({
    mutationFn: (payload: ClientContactMutationRequest) =>
      requestClientContactMutation({
        clientId,
        method: "POST",
        payload,
      }),
    onMutate: () => {
      setError(null);
    },
    onSuccess: async (response) => {
      setClientDetailContactsCache(clientId, response);
      await invalidateClientsList();
      await onSuccess?.(response);
    },
    onError: (caughtError) => {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to create contact.",
      );
    },
  });

  return {
    createContact: mutation.mutate,
    error,
    isPending: mutation.isPending,
    resetError: () => {
      setError(null);
    },
  };
};

export const useClientContactUpdateMutation = ({
  clientId,
  contactId,
  onSuccess,
}: ClientContactMutationOptions & { contactId: string }) => {
  const { invalidateClientsList, setClientDetailContactsCache } =
    useClientsCacheActions();
  const [error, setError] = useState<string | null>(null);
  const mutation = useMutation({
    mutationFn: (payload: ClientContactMutationRequest) =>
      requestClientContactMutation({
        clientId,
        contactId,
        method: "PATCH",
        payload,
      }),
    onMutate: () => {
      setError(null);
    },
    onSuccess: async (response) => {
      setClientDetailContactsCache(clientId, response);
      await invalidateClientsList();
      await onSuccess?.(response);
    },
    onError: (caughtError) => {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to update contact.",
      );
    },
  });

  return {
    error,
    isPending: mutation.isPending,
    resetError: () => {
      setError(null);
    },
    updateContact: mutation.mutate,
  };
};
