"use client";

import { useCallback, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import {
  authAccountUpdateRequestSchema,
  authPasswordUpdateRequestSchema,
  type AuthAccountUpdateRequest,
  type AuthAccountUpdateResponse,
  type AuthPasswordUpdateRequest,
  type AuthPasswordUpdateResponse,
} from "@recruitflow/contracts";

import { fetchJson } from "@/lib/query/fetcher";
import { userQueryKey } from "@/lib/query/options";

type AccountSettingsMutationOptions<TResponse> = {
  onSuccess?: (response: TResponse) => Promise<void> | void;
};

type AccountUpdateValues = {
  email: string;
  name: string;
};

type PasswordUpdateValues = {
  confirmPassword: string;
  currentPassword: string;
  newPassword: string;
};

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
};

const updateAccount = (payload: AuthAccountUpdateRequest) =>
  fetchJson<AuthAccountUpdateResponse>("/api/auth/account", {
    body: JSON.stringify(payload),
    headers: {
      accept: "application/json",
      "content-type": "application/json",
    },
    method: "PATCH",
  });

const updatePassword = (payload: AuthPasswordUpdateRequest) =>
  fetchJson<AuthPasswordUpdateResponse>("/api/auth/password", {
    body: JSON.stringify(payload),
    headers: {
      accept: "application/json",
      "content-type": "application/json",
    },
    method: "PATCH",
  });

const useAccountUpdateMutation = ({
  onSuccess,
}: AccountSettingsMutationOptions<AuthAccountUpdateResponse> = {}) => {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const { isPending, mutate, reset } = useMutation({
    mutationFn: updateAccount,
    onMutate: () => {
      setError(null);
      setSuccess(null);
    },
    onSuccess: async (response) => {
      setSuccess(response.success);
      await queryClient.invalidateQueries({
        exact: true,
        queryKey: userQueryKey,
      });
      await onSuccess?.(response);
    },
    onError: (caughtError) => {
      setError(
        getErrorMessage(caughtError, "Unable to update account details."),
      );
    },
  });

  const saveAccount = useCallback(
    (values: AccountUpdateValues) => {
      setError(null);
      setSuccess(null);

      const parsedPayload = authAccountUpdateRequestSchema.safeParse({
        email: values.email.trim(),
        name: values.name.trim(),
      });

      if (!parsedPayload.success) {
        setError(
          parsedPayload.error.issues[0]?.message ??
            "Invalid account update payload.",
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
    saveAccount,
    success,
  };
};

const usePasswordUpdateMutation = ({
  onSuccess,
}: AccountSettingsMutationOptions<AuthPasswordUpdateResponse> = {}) => {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const { isPending, mutate, reset } = useMutation({
    mutationFn: updatePassword,
    onMutate: () => {
      setError(null);
      setSuccess(null);
    },
    onSuccess: async (response) => {
      setSuccess(response.success);
      await onSuccess?.(response);
    },
    onError: (caughtError) => {
      setError(getErrorMessage(caughtError, "Unable to update password."));
    },
  });

  const savePassword = useCallback(
    (values: PasswordUpdateValues) => {
      setError(null);
      setSuccess(null);

      const parsedPayload = authPasswordUpdateRequestSchema.safeParse(values);

      if (!parsedPayload.success) {
        setError(
          parsedPayload.error.issues[0]?.message ??
            "Invalid password update payload.",
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
    savePassword,
    success,
  };
};

export { useAccountUpdateMutation, usePasswordUpdateMutation };
