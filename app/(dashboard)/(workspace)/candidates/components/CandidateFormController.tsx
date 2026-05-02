"use client";

import type { CandidatesListOwnerOption } from "@recruitflow/contracts";

import { CandidateForm } from "./CandidateForm";
import type { CandidateFormValues } from "./candidateFormValues";
import { useCandidateMutation } from "./hooks/useCandidateMutations";

type CandidateFormControllerProps = {
  candidateId?: string;
  initialValues: CandidateFormValues;
  mode: "create" | "edit";
  ownerOptions: CandidatesListOwnerOption[];
};

export const CandidateFormController = ({
  candidateId,
  initialValues,
  mode,
  ownerOptions,
}: CandidateFormControllerProps) => {
  const { error, isPending, saveCandidate } = useCandidateMutation({
    candidateId,
    mode,
  });

  return (
    <CandidateForm
      candidateId={candidateId}
      error={error}
      initialValues={initialValues}
      isPending={isPending}
      mode={mode}
      onSubmit={saveCandidate}
      ownerOptions={ownerOptions}
    />
  );
};
