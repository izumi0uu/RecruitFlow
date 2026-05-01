"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";

import {
  apiJobPriorityValues,
  apiJobStatusValues,
  type ApiJobPriority,
  type ApiJobStatus,
  type JobRecord,
} from "@recruitflow/contracts";

import { Button } from "@/components/ui/Button";

import { useJobMutation } from "./hooks/useJobMutations";
import type { JobFormValues } from "../utils";

type JobStatusPriorityControlsProps = {
  job: JobRecord;
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
  const [status, setStatus] = React.useState(job.status);
  const [priority, setPriority] = React.useState(job.priority);
  const [success, setSuccess] = React.useState<string | null>(null);
  const { error, isPending, saveJob } = useJobMutation({
    jobId: job.id,
    mode: "edit",
    onSuccess: (response) => {
      setStatus(response.job.status);
      setPriority(response.job.priority);
      setSuccess("Job controls saved.");
    },
  });

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        setSuccess(null);
        saveJob(buildControlValues(job, status, priority));
      }}
    >
      <label className="block space-y-2">
        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Status
        </span>
        <select
          className="input"
          value={status}
          required
          onChange={(event) => {
            setStatus(event.target.value as ApiJobStatus);
            setSuccess(null);
          }}
        >
          {apiJobStatusValues.map((nextStatus) => (
            <option key={nextStatus} value={nextStatus}>
              {toTitleCase(nextStatus)}
            </option>
          ))}
        </select>
      </label>

      <label className="block space-y-2">
        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Priority
        </span>
        <select
          className="input"
          value={priority}
          required
          onChange={(event) => {
            setPriority(event.target.value as ApiJobPriority);
            setSuccess(null);
          }}
        >
          {apiJobPriorityValues.map((nextPriority) => (
            <option key={nextPriority} value={nextPriority}>
              {toTitleCase(nextPriority)}
            </option>
          ))}
        </select>
      </label>

      {error ? <p className="status-message status-error">{error}</p> : null}
      {success ? (
        <p className="status-message status-success">{success}</p>
      ) : null}

      <Button
        type="submit"
        className="w-full rounded-full"
        disabled={isPending}
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
