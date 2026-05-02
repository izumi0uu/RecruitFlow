"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import {
  candidateMutationRequestSchema,
  type CandidateMutationResponse,
} from "@recruitflow/contracts";

import { candidatesListRootQueryKey } from "@/lib/query/options";

import type { CandidateFormValues } from "../candidateFormValues";

type CandidateMutationMode = "create" | "edit";

type UseCandidateMutationOptions = {
  candidateId?: string;
  mode: CandidateMutationMode;
};

const getCandidatePayload = (values: CandidateFormValues) => ({
  currentCompany: values.currentCompany,
  currentTitle: values.currentTitle,
  email: values.email,
  fullName: values.fullName,
  headline: values.headline,
  linkedinUrl: values.linkedinUrl,
  location: values.location,
  noticePeriod: values.noticePeriod,
  ownerUserId: values.ownerUserId,
  phone: values.phone,
  portfolioUrl: values.portfolioUrl,
  salaryExpectation: values.salaryExpectation,
  skillsText: values.skillsText,
  source: values.source,
});

const getCandidateMutationErrorMessage = async (response: Response) => {
  try {
    const body = (await response.json()) as { error?: string };

    if (body.error) {
      return body.error;
    }
  } catch {
    // Use the fallback when the BFF cannot produce JSON.
  }

  return `Candidate save failed with status ${response.status}`;
};

const requestCandidateMutation = async ({
  candidateId,
  mode,
  values,
}: UseCandidateMutationOptions & {
  values: CandidateFormValues;
}) => {
  const parsedPayload = candidateMutationRequestSchema.safeParse(
    getCandidatePayload(values),
  );

  if (!parsedPayload.success) {
    throw new Error(
      parsedPayload.error.issues[0]?.message ?? "Invalid candidate form",
    );
  }

  const response = await fetch(
    mode === "create" ? "/api/candidates" : `/api/candidates/${candidateId}`,
    {
      body: JSON.stringify(parsedPayload.data),
      headers: {
        "content-type": "application/json",
      },
      method: mode === "create" ? "POST" : "PATCH",
    },
  );

  if (response.status === 401) {
    throw new Error("UNAUTHENTICATED");
  }

  if (!response.ok) {
    throw new Error(await getCandidateMutationErrorMessage(response));
  }

  return (await response.json()) as CandidateMutationResponse;
};

export const useCandidateMutation = ({
  candidateId,
  mode,
}: UseCandidateMutationOptions) => {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const mutation = useMutation({
    mutationFn: (values: CandidateFormValues) =>
      requestCandidateMutation({ candidateId, mode, values }),
    onMutate: () => {
      setError(null);
    },
    onSuccess: async (response) => {
      queryClient.removeQueries({
        queryKey: candidatesListRootQueryKey,
        type: "inactive",
      });
      await queryClient.invalidateQueries({
        queryKey: candidatesListRootQueryKey,
        refetchType: "active",
      });

      if (mode === "create") {
        router.push(`/candidates/${response.candidate.id}/edit?created=1`);
        return;
      }

      router.push("/candidates");
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
          : "Unable to save candidate profile.",
      );
    },
  });

  return {
    error,
    isPending: mutation.isPending,
    saveCandidate: mutation.mutate,
  };
};
