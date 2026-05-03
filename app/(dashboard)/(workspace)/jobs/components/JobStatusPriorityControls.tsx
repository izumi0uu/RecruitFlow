"use client";

import {
  type ApiJobPriority,
  type ApiJobStatus,
  apiJobPriorityValues,
  apiJobStatusValues,
  type JobRecord,
} from "@recruitflow/contracts";
import { Loader2 } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/Button";
import { FilterSelect } from "@/components/ui/FilterSelect";
import { Label } from "@/components/ui/Label";
import type { JobFormValues } from "../utils";
import { useJobMutation } from "./hooks/useJobMutations";

type JobStatusPriorityControlsProps = {
  job: JobRecord;
};

type JobControlValues = {
  priority: ApiJobPriority;
  status: ApiJobStatus;
};

const toTitleCase = (value: string) =>
  value
    .split("_")
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(" ");

const formatNumberInputValue = (value: number | null) =>
  value == null ? "" : String(value);

const formatDateInputValue = (value: string | null) =>
  value ? value.slice(0, 10) : "";

const buildControlValues = (
  job: JobRecord,
  status: ApiJobStatus,
  priority: ApiJobPriority,
): JobFormValues => ({
  clientId: job.clientId,
  currency: job.currency ?? "USD",
  department: job.department ?? "",
  description: job.description ?? "",
  employmentType: job.employmentType ?? "",
  headcount: formatNumberInputValue(job.headcount),
  intakeSummary: job.intakeSummary ?? "",
  location: job.location ?? "",
  ownerUserId: job.ownerUserId ?? "",
  placementFeePercent: formatNumberInputValue(job.placementFeePercent),
  priority,
  salaryMax: formatNumberInputValue(job.salaryMax),
  salaryMin: formatNumberInputValue(job.salaryMin),
  status,
  targetFillDate: formatDateInputValue(job.targetFillDate),
  title: job.title,
});

export const JobStatusPriorityControls = ({
  job,
}: JobStatusPriorityControlsProps) => {
  const [controlValues, setControlValues] = React.useState<JobControlValues>({
    priority: job.priority,
    status: job.status,
  });
  const [success, setSuccess] = React.useState<string | null>(null);
  const { error, isPending, saveJob } = useJobMutation({
    jobId: job.id,
    mode: "edit",
    onSuccess: (response) => {
      setControlValues({
        priority: response.job.priority,
        status: response.job.status,
      });
      setSuccess("Job controls saved.");
    },
  });
  const updateControlValue =
    (field: keyof JobControlValues) => (value: string) => {
      setControlValues(
        (currentValues) =>
          ({
            ...currentValues,
            [field]: value,
          }) as JobControlValues,
      );
      setSuccess(null);
    };
  const statusOptions = apiJobStatusValues.map((nextStatus) => ({
    label: toTitleCase(nextStatus),
    value: nextStatus,
  }));
  const priorityOptions = apiJobPriorityValues.map((nextPriority) => ({
    label: toTitleCase(nextPriority),
    value: nextPriority,
  }));

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        setSuccess(null);
        saveJob(
          buildControlValues(job, controlValues.status, controlValues.priority),
        );
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="job-status">Status</Label>
        <FilterSelect
          id="job-status"
          options={statusOptions}
          placeholder="Select status"
          value={controlValues.status}
          onValueChange={updateControlValue("status")}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="job-priority">Priority</Label>
        <FilterSelect
          id="job-priority"
          options={priorityOptions}
          placeholder="Select priority"
          value={controlValues.priority}
          onValueChange={updateControlValue("priority")}
        />
      </div>

      {error ? <p className="status-message status-error">{error}</p> : null}
      {success ? (
        <p className="status-message status-success">{success}</p>
      ) : null}

      <Button
        type="submit"
        className="w-full rounded-full"
        disabled={isPending}
        variant="outline"
      >
        {isPending ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            Saving...
          </>
        ) : (
          "Save controls"
        )}
      </Button>
    </form>
  );
};
