"use client";

import {
  type MemberInvitationRequest,
  type MemberInvitationResponse,
  type MemberRemovalResponse,
  type MemberRoleUpdateRequest,
  type MemberRoleUpdateResponse,
  memberInvitationRequestSchema,
  memberRemovalParamsSchema,
  memberRoleUpdateParamsSchema,
  memberRoleUpdateRequestSchema,
} from "@recruitflow/contracts";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";

import { isApiRequestError } from "@/lib/api/errors";
import { fetchJson } from "@/lib/query/fetcher";
import { userQueryKey, workspaceQueryKey } from "@/lib/query/options";

type WorkspaceMemberMutationOptions<TResponse> = {
  onSuccess?: (response: TResponse) => Promise<void> | void;
};

type InviteWorkspaceMemberValues = {
  email: string;
  role: string;
};

type UpdateWorkspaceMemberRoleValues = {
  memberId: string;
  role: string;
};

const getMutationErrorMessage = (error: unknown, fallback: string) => {
  if (isApiRequestError(error) && error.message === "Forbidden resource") {
    return "Only workspace owners can manage workspace members.";
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
};

const inviteWorkspaceMember = (payload: MemberInvitationRequest) =>
  fetchJson<MemberInvitationResponse>("/api/members/invitations", {
    body: JSON.stringify(payload),
    headers: {
      accept: "application/json",
      "content-type": "application/json",
    },
    method: "POST",
  });

const removeWorkspaceMember = (memberId: string) =>
  fetchJson<MemberRemovalResponse>(`/api/members/${memberId}`, {
    headers: {
      accept: "application/json",
    },
    method: "DELETE",
  });

const updateWorkspaceMemberRole = ({
  memberId,
  role,
}: MemberRoleUpdateRequest & { memberId: string }) =>
  fetchJson<MemberRoleUpdateResponse>(`/api/members/${memberId}/role`, {
    body: JSON.stringify({ role }),
    headers: {
      accept: "application/json",
      "content-type": "application/json",
    },
    method: "PATCH",
  });

const useWorkspaceMemberInviteMutation = ({
  onSuccess,
}: WorkspaceMemberMutationOptions<MemberInvitationResponse> = {}) => {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const { isPending, mutate, reset } = useMutation({
    mutationFn: inviteWorkspaceMember,
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
        getMutationErrorMessage(caughtError, "Unable to invite member."),
      );
    },
  });

  const inviteMember = useCallback(
    (values: InviteWorkspaceMemberValues) => {
      setError(null);
      setSuccess(null);

      const parsedPayload = memberInvitationRequestSchema.safeParse({
        email: values.email.trim(),
        role: values.role,
      });

      if (!parsedPayload.success) {
        setError(
          parsedPayload.error.issues[0]?.message ??
            "Invalid member invitation payload.",
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
    inviteMember,
    isPending,
    resetStatus,
    success,
  };
};

const useWorkspaceMemberRemoveMutation = ({
  onSuccess,
}: WorkspaceMemberMutationOptions<MemberRemovalResponse> = {}) => {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const { isPending, mutate, reset, variables } = useMutation({
    mutationFn: removeWorkspaceMember,
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
        getMutationErrorMessage(caughtError, "Unable to remove member."),
      );
    },
  });

  const removeMember = useCallback(
    (memberId: string) => {
      setError(null);
      setSuccess(null);

      const parsedParams = memberRemovalParamsSchema.safeParse({ memberId });

      if (!parsedParams.success) {
        setError(
          parsedParams.error.issues[0]?.message ?? "Invalid workspace member.",
        );
        return;
      }

      mutate(parsedParams.data.memberId);
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
    removeMember,
    resetStatus,
    success,
    variables,
  };
};

const useWorkspaceMemberRoleUpdateMutation = ({
  onSuccess,
}: WorkspaceMemberMutationOptions<MemberRoleUpdateResponse> = {}) => {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const { isPending, mutate, reset, variables } = useMutation({
    mutationFn: updateWorkspaceMemberRole,
    onMutate: () => {
      setError(null);
      setSuccess(null);
    },
    onSuccess: async (response) => {
      setSuccess(response.message);
      await Promise.all([
        queryClient.invalidateQueries({
          exact: true,
          queryKey: workspaceQueryKey,
        }),
        queryClient.invalidateQueries({
          exact: true,
          queryKey: userQueryKey,
        }),
      ]);
      await onSuccess?.(response);
    },
    onError: (caughtError) => {
      setError(
        getMutationErrorMessage(caughtError, "Unable to update member role."),
      );
    },
  });

  const updateMemberRole = useCallback(
    (values: UpdateWorkspaceMemberRoleValues) => {
      setError(null);
      setSuccess(null);

      const parsedParams = memberRoleUpdateParamsSchema.safeParse({
        memberId: values.memberId,
      });

      if (!parsedParams.success) {
        setError(
          parsedParams.error.issues[0]?.message ?? "Invalid workspace member.",
        );
        return;
      }

      const parsedPayload = memberRoleUpdateRequestSchema.safeParse({
        role: values.role,
      });

      if (!parsedPayload.success) {
        setError(
          parsedPayload.error.issues[0]?.message ??
            "Invalid member role payload.",
        );
        return;
      }

      mutate({
        memberId: parsedParams.data.memberId,
        role: parsedPayload.data.role,
      });
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
    success,
    updateMemberRole,
    variables,
  };
};

export {
  useWorkspaceMemberInviteMutation,
  useWorkspaceMemberRemoveMutation,
  useWorkspaceMemberRoleUpdateMutation,
};
