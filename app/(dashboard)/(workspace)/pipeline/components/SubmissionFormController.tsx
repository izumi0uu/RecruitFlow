"use client";

import {
  SubmissionForm,
  type SubmissionCandidateOption,
  type SubmissionExistingOption,
  type SubmissionFormValues,
  type SubmissionJobOption,
} from "./SubmissionForm";
import { useSubmissionMutation } from "./hooks/useSubmissionMutations";

type SubmissionRedirectTarget = "candidate" | "job" | "pipeline";

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
  redirectTarget: SubmissionRedirectTarget;
};

export const SubmissionFormController = ({
  cancelHref,
  candidateOptions,
  existingSubmissions,
  initialValues,
  jobOptions,
  ownerOptions,
  redirectTarget,
}: SubmissionFormControllerProps) => {
  const { createSubmission, error, isPending } = useSubmissionMutation({
    redirectTarget,
  });

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
