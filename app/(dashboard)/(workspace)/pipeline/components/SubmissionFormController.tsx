"use client";

import { useSubmissionMutation } from "./hooks/useSubmissionMutations";
import {
  type SubmissionCandidateOption,
  type SubmissionExistingOption,
  SubmissionForm,
  type SubmissionFormValues,
  type SubmissionJobOption,
} from "./SubmissionForm";

type SubmissionFormControllerProps = {
  cancelHref: string;
  candidateOptions: SubmissionCandidateOption[];
  existingSubmissions: SubmissionExistingOption[];
  initialValues: SubmissionFormValues;
  jobOptions: SubmissionJobOption[];
  ownerOptions: Array<{
    email: string;
    id: string;
    name: string | null;
  }>;
};

export const SubmissionFormController = ({
  cancelHref,
  candidateOptions,
  existingSubmissions,
  initialValues,
  jobOptions,
  ownerOptions,
}: SubmissionFormControllerProps) => {
  const { createSubmission, error, isPending } = useSubmissionMutation();

  return (
    <SubmissionForm
      cancelHref={cancelHref}
      candidateOptions={candidateOptions}
      error={error}
      existingSubmissions={existingSubmissions}
      initialValues={initialValues}
      isPending={isPending}
      jobOptions={jobOptions}
      onSubmit={createSubmission}
      ownerOptions={ownerOptions}
    />
  );
};
