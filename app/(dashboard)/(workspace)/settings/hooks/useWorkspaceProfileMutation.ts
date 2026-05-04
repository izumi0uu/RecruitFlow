"use client";

import {
  type WorkspaceProfileUpdateRequest,
  type WorkspaceProfileUpdateResponse,
  workspaceProfileUpdateRequestSchema,
} from "@recruitflow/contracts";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";

import { fetchJson } from "@/lib/query/fetcher";
import { workspaceQueryKey } from "@/lib/query/options";

type WorkspaceProfileMutationOptions = {
  onSuccess?: (
    response: WorkspaceProfileUpdateResponse,
  ) => Promise<void> | void;
};

type WorkspaceProfileValues = {
  name: string;
  slug: string;
};

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
};

const updateWorkspaceProfile = (payload: WorkspaceProfileUpdateRequest) =>
  fetchJson<WorkspaceProfileUpdateResponse>("/api/workspace", {
    body: JSON.stringify(payload),
    headers: {
      accept: "application/json",
      "content-type": "application/json",
    },
    method: "PATCH",
  });

const useWorkspaceProfileUpdateMutation = ({
  onSuccess,
}: WorkspaceProfileMutationOptions = {}) => {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const { isPending, mutate, reset } = useMutation({
    mutationFn: updateWorkspaceProfile,
    onMutate: () => {
      setError(null);
      setSuccess(null);
    },
    onSuccess: async (response) => {
      setSuccess(response.message);
      await queryClient.invalidateQueries({
        exact: true,
        queryKey: workspaceQueryKey,
      });
      await onSuccess?.(response);
    },
    onError: (caughtError) => {
      setError(
        getErrorMessage(caughtError, "Unable to update workspace profile."),
      );
    },
  });

  const saveWorkspaceProfile = useCallback(
    (values: WorkspaceProfileValues) => {
      setError(null);
      setSuccess(null);

      const parsedPayload = workspaceProfileUpdateRequestSchema.safeParse({
        name: values.name.trim(),
        slug: values.slug.trim().toLowerCase(),
      });

      if (!parsedPayload.success) {
        setError(
          parsedPayload.error.issues[0]?.message ??
            "Invalid workspace profile payload.",
        );
        return;
      }

      mutate(parsedPayload.data);
    },
    [mutate],
  );

  const resetStatus = useCallback(() => {
    setError(null);
    setSuccess(null);
    reset();
  }, [reset]);

  return {
    error,
    isPending,
    resetStatus,
    saveWorkspaceProfile,
    success,
  };
};

export { useWorkspaceProfileUpdateMutation };
