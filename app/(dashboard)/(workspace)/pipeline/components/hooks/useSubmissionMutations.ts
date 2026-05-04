"use client";

import {
  type SubmissionMutationResponse,
  submissionMutationRequestSchema,
} from "@recruitflow/contracts";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  candidatesListRootQueryKey,
  jobDetailQueryKey,
  jobsListRootQueryKey,
  submissionsListRootQueryKey,
} from "@/lib/query/options";

import type { SubmissionFormValues } from "../SubmissionForm";

const getSubmissionPayload = (values: SubmissionFormValues) => ({
  candidateId: values.candidateId,
  jobId: values.jobId,
  nextStep: values.nextStep,
  ownerUserId: values.ownerUserId,
  riskFlag: values.riskFlag,
  stage: values.stage,
});

const getSubmissionMutationErrorMessage = async (response: Response) => {
  try {
    const body = (await response.json()) as { error?: string };

    if (body.error) {
      return body.error;
    }
  } catch {
    // Fall through to the generic status message.
  }

  return `Submission create failed with status ${response.status}`;
};

const requestSubmissionMutation = async (values: SubmissionFormValues) => {
  const parsedPayload = submissionMutationRequestSchema.safeParse(
    getSubmissionPayload(values),
  );

  if (!parsedPayload.success) {
    throw new Error(
      parsedPayload.error.issues[0]?.message ?? "Invalid submission form",
    );
  }

  const response = await fetch("/api/submissions", {
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
    throw new Error(await getSubmissionMutationErrorMessage(response));
  }

  return (await response.json()) as SubmissionMutationResponse;
};

const getSubmissionRedirectPath = (response: SubmissionMutationResponse) => {
  const params = new URLSearchParams({
    candidateId: response.submission.candidateId,
    jobId: response.submission.jobId,
    submissionCreated: "1",
    view: "list",
  });

  return `/pipeline?${params.toString()}`;
};

export const useSubmissionMutation = () => {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const mutation = useMutation({
    mutationFn: requestSubmissionMutation,
    onMutate: () => {
      setError(null);
    },
    onSuccess: async (response) => {
      queryClient.removeQueries({
        queryKey: submissionsListRootQueryKey,
        type: "inactive",
      });
      queryClient.removeQueries({
        queryKey: jobsListRootQueryKey,
        type: "inactive",
      });
      queryClient.removeQueries({
        queryKey: candidatesListRootQueryKey,
        type: "inactive",
      });
      queryClient.invalidateQueries({
        queryKey: jobDetailQueryKey(response.submission.jobId),
      });
      await queryClient.invalidateQueries({
        queryKey: submissionsListRootQueryKey,
        refetchType: "active",
      });

      router.push(getSubmissionRedirectPath(response));
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
          : "Unable to create submission.",
      );
    },
  });

  return {
    createSubmission: mutation.mutate,
    error,
    isPending: mutation.isPending,
  };
};
