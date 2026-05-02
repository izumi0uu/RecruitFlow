"use client";

import type { ChangeEvent, ReactNode } from "react";

import { FilterSelect } from "@/components/ui/FilterSelect";
import { Label } from "@/components/ui/Label";
import { cn } from "@/lib/utils";

import {
  launchStageValues,
  riskOptions,
  type SubmissionFormValues,
  stageDescriptionMap,
  stageLabelMap,
} from "./utils/submissionFormTypes";

type SelectOption = {
  disabled?: boolean;
  label: string;
  value: string;
};

const SelectShell = ({
  children,
  description,
  label,
}: {
  children: ReactNode;
  description: string;
  label: string;
}) => (
  <div className="space-y-2">
    <div className="space-y-1">
      <Label>{label}</Label>
      <p className="text-xs leading-5 text-muted-foreground">{description}</p>
    </div>
    {children}
  </div>
);

export const SubmissionLaunchSetup = ({
  candidateSelectOptions,
  hasCandidates,
  hasJobs,
  hasOwners,
  jobSelectOptions,
  onInputChange,
  onSelectChange,
  ownerSelectOptions,
  values,
}: {
  candidateSelectOptions: SelectOption[];
  hasCandidates: boolean;
  hasJobs: boolean;
  hasOwners: boolean;
  jobSelectOptions: SelectOption[];
  onInputChange: (
    field: keyof SubmissionFormValues,
  ) => (
    event: ChangeEvent<
      HTMLSelectElement | HTMLTextAreaElement | HTMLInputElement
    >,
  ) => void;
  onSelectChange: (
    field: keyof SubmissionFormValues,
  ) => (value: string) => void;
  ownerSelectOptions: SelectOption[];
  values: SubmissionFormValues;
}) => (
  <div className="rounded-[1.75rem] border border-border/70 bg-background/58 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] sm:p-5">
    <div className="space-y-1">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        Launch setup
      </p>
      <h3 className="text-base font-semibold text-foreground">
        Set the owner, first stage, risk, and next action.
      </h3>
    </div>

    <div className="mt-5 grid gap-5 lg:grid-cols-2">
      <SelectShell
        description="Choose the client role this opportunity belongs to."
        label="Role"
      >
        <FilterSelect
          name="jobId"
          options={jobSelectOptions}
          placeholder={hasJobs ? "Select role" : "Create a job first"}
          value={values.jobId}
          disabled={!hasJobs}
          onValueChange={onSelectChange("jobId")}
        />
      </SelectShell>

      <SelectShell
        description="Choose the candidate to activate for this role."
        label="Candidate"
      >
        <FilterSelect
          name="candidateId"
          options={candidateSelectOptions}
          placeholder={
            hasCandidates ? "Select candidate" : "Create a candidate first"
          }
          value={values.candidateId}
          disabled={!hasCandidates}
          onValueChange={onSelectChange("candidateId")}
        />
      </SelectShell>

      <SelectShell
        description="Owns the next step after launch."
        label="Opportunity owner"
      >
        <FilterSelect
          name="ownerUserId"
          options={ownerSelectOptions}
          placeholder="Select owner"
          value={values.ownerUserId}
          disabled={!hasOwners}
          onValueChange={onSelectChange("ownerUserId")}
        />
      </SelectShell>

      <SelectShell
        description="Launch only starts in an early operational stage."
        label="Initial stage"
      >
        <div className="grid gap-2 sm:grid-cols-3">
          {launchStageValues.map((stage) => (
            <label
              key={stage}
              className={cn(
                "flex min-h-24 cursor-pointer flex-col gap-2 rounded-[1rem] border px-3 py-3 text-sm transition-colors",
                values.stage === stage
                  ? "border-foreground/20 bg-foreground text-background"
                  : "border-border/70 bg-surface-1/70 text-foreground hover:bg-surface-2",
              )}
            >
              <input
                type="radio"
                className="sr-only"
                name="stage"
                value={stage}
                checked={values.stage === stage}
                onChange={onInputChange("stage")}
                required
              />
              <span className="font-semibold">{stageLabelMap[stage]}</span>
              <span
                className={cn(
                  "text-xs leading-5",
                  values.stage === stage
                    ? "text-background/75"
                    : "text-muted-foreground",
                )}
              >
                {stageDescriptionMap[stage]}
              </span>
            </label>
          ))}
        </div>
      </SelectShell>

      <div className="space-y-2 lg:col-span-2">
        <div className="space-y-1">
          <Label>Risk marker</Label>
          <p className="text-xs leading-5 text-muted-foreground">
            Mark the first operating concern so the pipeline card is scannable
            later.
          </p>
        </div>
        <div className="grid gap-2 md:grid-cols-5">
          {riskOptions.map((riskOption) => {
            const selected = values.riskFlag === riskOption.value;

            return (
              <label
                key={riskOption.value}
                className={cn(
                  "flex min-h-28 cursor-pointer flex-col gap-2 rounded-[1rem] border px-3 py-3 text-sm transition-colors",
                  selected
                    ? riskOption.tone
                    : "border-border/70 bg-surface-1/70 text-foreground hover:bg-surface-2",
                )}
              >
                <input
                  type="radio"
                  className="sr-only"
                  name="riskFlag"
                  value={riskOption.value}
                  checked={selected}
                  onChange={onInputChange("riskFlag")}
                  required
                />
                <span className="font-semibold">{riskOption.label}</span>
                <span className="text-xs leading-5 text-muted-foreground">
                  {riskOption.description}
                </span>
              </label>
            );
          })}
        </div>
      </div>

      <div className="space-y-2 lg:col-span-2">
        <Label htmlFor="nextStep">First next step</Label>
        <textarea
          id="nextStep"
          className="input min-h-28 resize-y py-3"
          name="nextStep"
          onChange={onInputChange("nextStep")}
          placeholder="Send candidate profile to client by Friday"
          value={values.nextStep}
          required
        />
      </div>
    </div>
  </div>
);
