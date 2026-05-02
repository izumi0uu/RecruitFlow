"use client";

import type {
  ApiJobPriority,
  ApiJobStatus,
  JobsListClientOption,
  JobsListOwnerOption,
} from "@recruitflow/contracts";
import { Loader2 } from "lucide-react";
import { type FormEvent, useState } from "react";

import { TrackedLink } from "@/components/navigation/TrackedLink";
import { Button } from "@/components/ui/Button";
import { FilterSelect } from "@/components/ui/FilterSelect";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";

import type { JobFormValues } from "../utils";
import { jobPriorityOptions, jobStatusOptions } from "../utils";

export {
  buildJobFormValues,
  emptyJobFormValues,
  formatDateInputValue,
  numericJobFormValue,
} from "../utils";

type JobFormProps = {
  clientOptions: JobsListClientOption[];
  error?: string | null;
  initialValues: JobFormValues;
  isPending: boolean;
  jobId?: string;
  mode: "create" | "edit";
  onSubmit: (values: JobFormValues) => void;
  ownerOptions: JobsListOwnerOption[];
};

type JobSelectValues = Pick<
  JobFormValues,
  "clientId" | "ownerUserId" | "priority" | "status"
>;

const getString = (value: FormDataEntryValue | null) =>
  typeof value === "string" ? value : "";

const getJobFormValues = (formData: FormData): JobFormValues => ({
  clientId: getString(formData.get("clientId")),
  currency: getString(formData.get("currency")),
  department: getString(formData.get("department")),
  description: getString(formData.get("description")),
  employmentType: getString(formData.get("employmentType")),
  headcount: getString(formData.get("headcount")),
  intakeSummary: getString(formData.get("intakeSummary")),
  location: getString(formData.get("location")),
  ownerUserId: getString(formData.get("ownerUserId")),
  placementFeePercent: getString(formData.get("placementFeePercent")),
  priority: getString(formData.get("priority")) as ApiJobPriority | "",
  salaryMax: getString(formData.get("salaryMax")),
  salaryMin: getString(formData.get("salaryMin")),
  status: getString(formData.get("status")) as ApiJobStatus | "",
  targetFillDate: getString(formData.get("targetFillDate")),
  title: getString(formData.get("title")),
});

export const JobForm = ({
  clientOptions,
  error,
  initialValues,
  isPending,
  jobId,
  mode,
  onSubmit,
  ownerOptions,
}: JobFormProps) => {
  const values = initialValues;
  const [selectValues, setSelectValues] = useState<JobSelectValues>({
    clientId: values.clientId,
    ownerUserId: values.ownerUserId,
    priority: values.priority,
    status: values.status,
  });
  const updateSelectValue = (field: keyof JobSelectValues) => (value: string) =>
    setSelectValues((currentValues) => ({
      ...currentValues,
      [field]: value,
    }));
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!Object.values(selectValues).every(Boolean)) {
      return;
    }

    onSubmit(getJobFormValues(new FormData(event.currentTarget)));
  };
  const hasClients = clientOptions.length > 0;
  const canSubmit = hasClients && Object.values(selectValues).every(Boolean);
  const clientSelectOptions = clientOptions.map((client) => ({
    label: client.name,
    value: client.id,
  }));
  const ownerSelectOptions = ownerOptions.map((owner) => ({
    label: owner.name ?? owner.email,
    value: owner.id,
  }));

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {jobId ? <input type="hidden" name="jobId" value={jobId} /> : null}

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-2 lg:col-span-2">
          <Label htmlFor="title">Job title</Label>
          <Input
            id="title"
            name="title"
            placeholder="Senior Full Stack Engineer"
            defaultValue={values.title}
            required
          />
          <p className="text-xs leading-5 text-muted-foreground">
            Use the client-facing role name. Downstream submission and dashboard
            surfaces will inherit this label.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="clientId">Client</Label>
          <FilterSelect
            id="clientId"
            name="clientId"
            disabled={!hasClients}
            onValueChange={updateSelectValue("clientId")}
            options={clientSelectOptions}
            placeholder={hasClients ? "Select client" : "Create a client first"}
            value={selectValues.clientId}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="ownerUserId">Job owner</Label>
          <FilterSelect
            id="ownerUserId"
            name="ownerUserId"
            onValueChange={updateSelectValue("ownerUserId")}
            options={ownerSelectOptions}
            placeholder="Select owner"
            value={selectValues.ownerUserId}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <FilterSelect
            id="status"
            name="status"
            onValueChange={updateSelectValue("status")}
            options={jobStatusOptions}
            placeholder="Select status"
            value={selectValues.status}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="priority">Priority</Label>
          <FilterSelect
            id="priority"
            name="priority"
            onValueChange={updateSelectValue("priority")}
            options={jobPriorityOptions}
            placeholder="Select priority"
            value={selectValues.priority}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="department">Department</Label>
          <Input
            id="department"
            name="department"
            placeholder="Engineering"
            defaultValue={values.department}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="location">Location</Label>
          <Input
            id="location"
            name="location"
            placeholder="Austin, TX or Remote"
            defaultValue={values.location}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="employmentType">Employment type</Label>
          <Input
            id="employmentType"
            name="employmentType"
            placeholder="Full-time"
            defaultValue={values.employmentType}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="headcount">Headcount</Label>
          <Input
            id="headcount"
            name="headcount"
            type="number"
            min="0"
            inputMode="numeric"
            defaultValue={values.headcount}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="salaryMin">Salary minimum</Label>
          <Input
            id="salaryMin"
            name="salaryMin"
            type="number"
            min="0"
            inputMode="numeric"
            placeholder="140000"
            defaultValue={values.salaryMin}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="salaryMax">Salary maximum</Label>
          <Input
            id="salaryMax"
            name="salaryMax"
            type="number"
            min="0"
            inputMode="numeric"
            placeholder="180000"
            defaultValue={values.salaryMax}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="currency">Currency</Label>
          <Input
            id="currency"
            name="currency"
            placeholder="USD"
            defaultValue={values.currency}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="placementFeePercent">Placement fee %</Label>
          <Input
            id="placementFeePercent"
            name="placementFeePercent"
            type="number"
            min="0"
            inputMode="numeric"
            placeholder="20"
            defaultValue={values.placementFeePercent}
          />
        </div>

        <div className="space-y-2 lg:col-span-2">
          <Label htmlFor="targetFillDate">Target fill date</Label>
          <Input
            id="targetFillDate"
            name="targetFillDate"
            type="date"
            defaultValue={values.targetFillDate}
          />
        </div>

        <div className="space-y-2 lg:col-span-2">
          <Label htmlFor="intakeSummary">Intake summary</Label>
          <textarea
            id="intakeSummary"
            className="input min-h-28 resize-y py-3"
            name="intakeSummary"
            placeholder="The crisp hiring context: why now, must-have skills, interview shape, and placement urgency."
            defaultValue={values.intakeSummary}
          />
        </div>

        <div className="space-y-2 lg:col-span-2">
          <Label htmlFor="description">Role description</Label>
          <textarea
            id="description"
            className="input min-h-36 resize-y py-3"
            name="description"
            placeholder="Paste the working JD or internal role notes here. RF-070+ can summarize it later without blocking the basic intake record."
            defaultValue={values.description}
          />
        </div>
      </div>

      {error ? <p className="status-message status-error">{error}</p> : null}

      {!hasClients ? (
        <p className="status-message border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300">
          Jobs need a client first. Create a client, then return here to attach
          the requisition to the right account.
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="submit"
          className="rounded-full"
          disabled={isPending || !canSubmit}
        >
          {isPending ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Saving...
            </>
          ) : mode === "create" ? (
            "Create job"
          ) : (
            "Save job"
          )}
        </Button>
        <Button
          asChild
          type="button"
          variant="outline"
          className="rounded-full"
        >
          <TrackedLink href="/jobs">Cancel</TrackedLink>
        </Button>
      </div>
    </form>
  );
};
