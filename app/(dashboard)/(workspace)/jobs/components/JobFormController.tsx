"use client";

import { useRouter } from "next/navigation";

import type {
  JobsListClientOption,
  JobsListOwnerOption,
} from "@recruitflow/contracts";

import { JobForm } from "./JobForm";
import { useJobMutation } from "./hooks/useJobMutations";
import type { JobFormValues } from "../utils";

type JobFormControllerProps = {
  clientOptions: JobsListClientOption[];
  initialValues: JobFormValues;
  jobId?: string;
  mode: "create" | "edit";
  ownerOptions: JobsListOwnerOption[];
};

export const JobFormController = ({
  clientOptions,
  initialValues,
  jobId,
  mode,
  ownerOptions,
}: JobFormControllerProps) => {
  const router = useRouter();
  const { error, isPending, saveJob } = useJobMutation({
    jobId,
    mode,
    onSuccess: (response) => {
      if (mode === "create") {
        router.push(`/jobs/${response.job.id}/edit?created=1`);
        return;
      }

      router.push("/jobs");
    },
  });

  return (
    <JobForm
      clientOptions={clientOptions}
      error={error}
      initialValues={initialValues}
      isPending={isPending}
      jobId={jobId}
      mode={mode}
      onSubmit={saveJob}
      ownerOptions={ownerOptions}
    />
  );
};
