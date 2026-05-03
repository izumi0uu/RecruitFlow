"use client";

import {
  type TaskMutationResponse,
  taskMutationRequestSchema,
} from "@recruitflow/contracts";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

import { isApiRequestError } from "@/lib/api/errors";
import { fetchJson } from "@/lib/query/fetcher";
import { tasksListRootQueryKey } from "@/lib/query/options";

import type { TaskFormValues } from "../../utils";
import { parseTaskEntityKey } from "../../utils";

type TaskMutationMode = "create" | "edit";

type UseTaskMutationOptions = {
  mode: TaskMutationMode;
  onSuccess?: (response: TaskMutationResponse) => Promise<void> | void;
  taskId?: string;
};

const getTaskPayload = (values: TaskFormValues) => {
  const linkedEntity = parseTaskEntityKey(values.entityKey);

  return {
    assignedToUserId: values.assignedToUserId,
    description: values.description,
    dueAt: values.dueAt,
    entityId: linkedEntity?.entityId ?? "",
    entityType: linkedEntity?.entityType,
    title: values.title,
  };
};

const requestTaskMutation = async ({
  mode,
  taskId,
  values,
}: {
  mode: TaskMutationMode;
  taskId?: string;
  values: TaskFormValues;
}) => {
  const parsedPayload = taskMutationRequestSchema.safeParse(
    getTaskPayload(values),
  );

  if (!parsedPayload.success) {
    throw new Error(
      parsedPayload.error.issues[0]?.message ?? "Invalid task form",
    );
  }

  return fetchJson<TaskMutationResponse>(
    mode === "create" ? "/api/tasks" : `/api/tasks/${taskId}`,
    {
      body: JSON.stringify(parsedPayload.data),
      headers: {
        accept: "application/json",
        "content-type": "application/json",
      },
      method: mode === "create" ? "POST" : "PATCH",
    },
  );
};

export const useTasksCacheActions = () => {
  const queryClient = useQueryClient();

  const invalidateTasksList = useCallback(async () => {
    await queryClient.invalidateQueries({
      queryKey: tasksListRootQueryKey,
      refetchType: "active",
    });
  }, [queryClient]);

  const removeInactiveTasksListCache = useCallback(() => {
    queryClient.removeQueries({
      queryKey: tasksListRootQueryKey,
      type: "inactive",
    });
  }, [queryClient]);

  return {
    invalidateTasksList,
    removeInactiveTasksListCache,
  };
};

export const useTaskMutation = ({
  mode,
  onSuccess,
  taskId,
}: UseTaskMutationOptions) => {
  const router = useRouter();
  const { invalidateTasksList, removeInactiveTasksListCache } =
    useTasksCacheActions();
  const [error, setError] = useState<string | null>(null);
  const mutation = useMutation({
    mutationFn: (values: TaskFormValues) =>
      requestTaskMutation({ mode, taskId, values }),
    onMutate: () => {
      setError(null);
    },
    onSuccess: async (response) => {
      removeInactiveTasksListCache();
      await invalidateTasksList();
      await onSuccess?.(response);
    },
    onError: (mutationError) => {
      if (isApiRequestError(mutationError) && mutationError.status === 401) {
        router.push("/sign-in");
        return;
      }

      setError(
        mutationError instanceof Error
          ? mutationError.message
          : "Unable to save task.",
      );
    },
  });

  const resetError = useCallback(() => {
    setError(null);
  }, []);

  return {
    error,
    isPending: mutation.isPending,
    resetError,
    saveTask: mutation.mutate,
  };
};
