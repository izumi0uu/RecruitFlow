"use client";

import type {
  ApiJobStatus,
  ApiRiskFlag,
  ApiSubmissionStage,
  ApiUserReference,
} from "@recruitflow/contracts";
import {
  AlertTriangle,
  ArrowRight,
  BriefcaseBusiness,
  CheckCircle2,
  Loader2,
  ShieldAlert,
  UserRound,
} from "lucide-react";
import type { ChangeEvent, FormEvent, ReactNode } from "react";
import { useMemo, useState } from "react";

import { TrackedLink } from "@/components/navigation/TrackedLink";
import { Button } from "@/components/ui/Button";
import { FilterSelect } from "@/components/ui/FilterSelect";
import { Label } from "@/components/ui/Label";
import { cn } from "@/lib/utils";

export type SubmissionFormValues = {
  candidateId: string;
  jobId: string;
  nextStep: string;
  ownerUserId: string;
  riskFlag: ApiRiskFlag | "";
  stage: ApiSubmissionStage | "";
};

export type SubmissionJobOption = {
  clientName: string | null;
  id: string;
  ownerUserId: string | null;
  status: ApiJobStatus;
  title: string;
};

export type SubmissionCandidateOption = {
  currentCompany: string | null;
  currentTitle: string | null;
  email: string | null;
  hasResume: boolean;
  headline: string | null;
  id: string;
  name: string;
  ownerUserId: string | null;
  phone: string | null;
};

export type SubmissionExistingOption = {
  candidateId: string;
  id: string;
  jobId: string;
  nextStep: string | null;
  stage: ApiSubmissionStage;
};

type SubmissionFormProps = {
  cancelHref: string;
  candidateOptions: SubmissionCandidateOption[];
  error?: string | null;
  existingSubmissions: SubmissionExistingOption[];
  initialValues: SubmissionFormValues;
  isPending: boolean;
  jobOptions: SubmissionJobOption[];
  onSubmit: (values: SubmissionFormValues) => void;
  ownerOptions: ApiUserReference[];
};

type ReadinessTone = "attention" | "blocked" | "ready";

const launchStageValues = [
  "sourced",
  "screening",
  "submitted",
] as const satisfies readonly ApiSubmissionStage[];

const stageLabelMap: Record<ApiSubmissionStage, string> = {
  client_interview: "Client interview",
  lost: "Lost",
  offer: "Offer",
  placed: "Placed",
  screening: "Screening",
  sourced: "Sourced",
  submitted: "Submitted",
};

const stageDescriptionMap: Record<(typeof launchStageValues)[number], string> =
  {
    screening: "Recruiter is qualifying fit before client handoff.",
    sourced: "Opportunity has been identified and needs first action.",
    submitted: "Candidate is ready to be sent to the client.",
  };

const riskOptions = [
  {
    description: "No active blocker.",
    label: "Clear",
    tone: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    value: "none",
  },
  {
    description: "Availability, notice, or deadline pressure.",
    label: "Timing",
    tone: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
    value: "timing_risk",
  },
  {
    description: "Client response or interview feedback is unclear.",
    label: "Feedback",
    tone: "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300",
    value: "feedback_risk",
  },
  {
    description: "Compensation expectation may not align.",
    label: "Comp",
    tone: "border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-300",
    value: "compensation_risk",
  },
  {
    description: "Skills, seniority, or domain match needs review.",
    label: "Fit",
    tone: "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300",
    value: "fit_risk",
  },
] as const satisfies readonly {
  description: string;
  label: string;
  tone: string;
  value: ApiRiskFlag;
}[];

const readinessToneClassMap: Record<ReadinessTone, string> = {
  attention:
    "border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-200",
  blocked: "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300",
  ready:
    "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
};

export const emptySubmissionFormValues: SubmissionFormValues = {
  candidateId: "",
  jobId: "",
  nextStep: "",
  ownerUserId: "",
  riskFlag: "none",
  stage: "sourced",
};

export const buildSubmissionFormValues = (
  values: Partial<SubmissionFormValues>,
): SubmissionFormValues => ({
  ...emptySubmissionFormValues,
  ...values,
});

const isLaunchableJobStatus = (status: ApiJobStatus) =>
  !["closed", "filled"].includes(status);

const getJobSelectLabel = (job: SubmissionJobOption) =>
  `${job.title}${job.clientName ? ` - ${job.clientName}` : ""}${
    isLaunchableJobStatus(job.status) ? "" : ` (${job.status})`
  }`;

const getCandidateSelectLabel = (candidate: SubmissionCandidateOption) =>
  `${candidate.name}${candidate.headline ? ` - ${candidate.headline}` : ""}`;

const getCandidateFocus = (candidate: SubmissionCandidateOption) =>
  [candidate.currentTitle, candidate.currentCompany]
    .filter(Boolean)
    .join(" at ") ||
  candidate.headline ||
  "Candidate context pending";

const getOwnerLabel = (owner: ApiUserReference | null | undefined) =>
  owner ? (owner.name ?? owner.email) : "Owner not selected";

const getCandidateFirstName = (name: string) =>
  name.trim().split(/\s+/)[0] ?? "";

const getLaunchButtonLabel = (
  candidate: SubmissionCandidateOption | undefined,
  job: SubmissionJobOption | undefined,
) => {
  if (!candidate || !job) {
    return "Launch opportunity";
  }

  const firstName = getCandidateFirstName(candidate.name);

  return firstName.length > 18
    ? "Launch opportunity"
    : `Launch ${firstName} for this role`;
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

const OpportunityPreviewPanel = ({
  children,
  icon,
  label,
  title,
}: {
  children: ReactNode;
  icon: ReactNode;
  label: string;
  title: string;
}) => (
  <div className="min-w-0 rounded-[1.35rem] border border-border/70 bg-surface-1/70 p-4">
    <div className="flex items-start gap-3">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-[1rem] border border-border/70 bg-background/72 text-foreground">
        {icon}
      </span>
      <div className="min-w-0 space-y-1">
        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          {label}
        </p>
        <p className="truncate text-sm font-semibold text-foreground">
          {title}
        </p>
        <div className="text-xs leading-5 text-muted-foreground">
          {children}
        </div>
      </div>
    </div>
  </div>
);

const ReadinessItem = ({
  children,
  tone,
}: {
  children: ReactNode;
  tone: ReadinessTone;
}) => {
  const Icon = tone === "ready" ? CheckCircle2 : AlertTriangle;

  return (
    <li
      className={cn(
        "flex items-start gap-2 rounded-[1rem] border px-3 py-2.5 text-sm leading-5",
        readinessToneClassMap[tone],
      )}
    >
      <Icon className="mt-0.5 size-4 shrink-0" />
      <span className="min-w-0">{children}</span>
    </li>
  );
};

export const SubmissionForm = ({
  cancelHref,
  candidateOptions,
  error,
  existingSubmissions,
  initialValues,
  isPending,
  jobOptions,
  onSubmit,
  ownerOptions,
}: SubmissionFormProps) => {
  const [values, setValues] = useState<SubmissionFormValues>(initialValues);
  const selectedJob = useMemo(
    () => jobOptions.find((job) => job.id === values.jobId),
    [jobOptions, values.jobId],
  );
  const selectedCandidate = useMemo(
    () =>
      candidateOptions.find((candidate) => candidate.id === values.candidateId),
    [candidateOptions, values.candidateId],
  );
  const selectedOwner = useMemo(
    () => ownerOptions.find((owner) => owner.id === values.ownerUserId),
    [ownerOptions, values.ownerUserId],
  );
  const jobSelectOptions = useMemo(
    () =>
      jobOptions.map((job) => ({
        disabled: !isLaunchableJobStatus(job.status),
        label: getJobSelectLabel(job),
        value: job.id,
      })),
    [jobOptions],
  );
  const candidateSelectOptions = useMemo(
    () =>
      candidateOptions.map((candidate) => ({
        label: getCandidateSelectLabel(candidate),
        value: candidate.id,
      })),
    [candidateOptions],
  );
  const ownerSelectOptions = useMemo(
    () =>
      ownerOptions.map((owner) => ({
        label: owner.name ?? owner.email,
        value: owner.id,
      })),
    [ownerOptions],
  );
  const duplicateSubmission = useMemo(
    () =>
      existingSubmissions.find(
        (submission) =>
          submission.jobId === values.jobId &&
          submission.candidateId === values.candidateId,
      ),
    [existingSubmissions, values.candidateId, values.jobId],
  );
  const hasCandidates = candidateOptions.length > 0;
  const hasJobs = jobOptions.length > 0;
  const hasOwners = ownerOptions.length > 0;
  const selectedJobLaunchable = selectedJob
    ? isLaunchableJobStatus(selectedJob.status)
    : false;
  const hasContact = Boolean(
    selectedCandidate?.email || selectedCandidate?.phone,
  );
  const canSubmit = Boolean(
    hasCandidates &&
      hasJobs &&
      hasOwners &&
      selectedCandidate &&
      selectedJob &&
      selectedOwner &&
      selectedJobLaunchable &&
      !duplicateSubmission &&
      values.nextStep.trim(),
  );
  const opportunityTitle =
    selectedCandidate && selectedJob
      ? `${selectedCandidate.name} for ${selectedJob.title}${
          selectedJob.clientName ? ` at ${selectedJob.clientName}` : ""
        }`
      : "Choose a candidate and role to launch";

  const updateValue =
    (field: keyof SubmissionFormValues) =>
    (
      event: ChangeEvent<
        HTMLSelectElement | HTMLTextAreaElement | HTMLInputElement
      >,
    ) => {
      setValues((currentValues) => ({
        ...currentValues,
        [field]: event.target.value,
      }));
    };
  const updateSelectValue =
    (field: keyof SubmissionFormValues) => (value: string) => {
      setValues((currentValues) => ({
        ...currentValues,
        [field]: value,
      }));
    };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!canSubmit) {
      return;
    }

    onSubmit(values);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <section className="rounded-[1.75rem] border border-border/70 bg-background/58 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Opportunity pair
            </p>
            <h2 className="text-xl font-semibold tracking-normal text-foreground sm:text-2xl">
              {opportunityTitle}
            </h2>
            <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
              Launch creates the trackable candidate-role opportunity that the
              pipeline, follow-up, risk, and stage movement will operate on.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2 rounded-full border border-border/70 bg-surface-1/75 px-3 py-2 text-xs font-semibold text-muted-foreground">
            <ShieldAlert className="size-4" />
            API-owned duplicate guard
          </div>
        </div>

        <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:items-stretch">
          <OpportunityPreviewPanel
            icon={<UserRound className="size-4" />}
            label="Candidate"
            title={selectedCandidate?.name ?? "Select candidate"}
          >
            {selectedCandidate ? (
              <>
                <p className="truncate">
                  {getCandidateFocus(selectedCandidate)}
                </p>
                <p className="mt-1">
                  {selectedCandidate.hasResume
                    ? "Resume ready"
                    : "Resume missing"}
                  {" / "}
                  {hasContact ? "Contact ready" : "Contact missing"}
                </p>
              </>
            ) : (
              "Pick the person you want to move into the pipeline."
            )}
          </OpportunityPreviewPanel>

          <div className="hidden items-center justify-center text-muted-foreground lg:flex">
            <span className="flex size-10 items-center justify-center rounded-full border border-border/70 bg-surface-1/75">
              <ArrowRight className="size-4" />
            </span>
          </div>

          <OpportunityPreviewPanel
            icon={<BriefcaseBusiness className="size-4" />}
            label="Role"
            title={selectedJob?.title ?? "Select role"}
          >
            {selectedJob ? (
              <>
                <p className="truncate">
                  {selectedJob.clientName ?? "Client context missing"}
                </p>
                <p className="mt-1">
                  {selectedJobLaunchable
                    ? "Launchable role"
                    : "Closed and filled roles cannot receive new submissions"}
                </p>
              </>
            ) : (
              "Pick the client role this candidate should be tracked against."
            )}
          </OpportunityPreviewPanel>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
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
                onValueChange={updateSelectValue("jobId")}
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
                  hasCandidates
                    ? "Select candidate"
                    : "Create a candidate first"
                }
                value={values.candidateId}
                disabled={!hasCandidates}
                onValueChange={updateSelectValue("candidateId")}
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
                onValueChange={updateSelectValue("ownerUserId")}
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
                      onChange={updateValue("stage")}
                      required
                    />
                    <span className="font-semibold">
                      {stageLabelMap[stage]}
                    </span>
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
                  Mark the first operating concern so the pipeline card is
                  scannable later.
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
                        onChange={updateValue("riskFlag")}
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
                onChange={updateValue("nextStep")}
                placeholder="Send candidate profile to client by Friday"
                value={values.nextStep}
                required
              />
            </div>
          </div>
        </div>

        <aside className="rounded-[1.75rem] border border-border/70 bg-background/58 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] sm:p-5">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Readiness
            </p>
            <h3 className="text-base font-semibold text-foreground">
              Launch guard
            </h3>
          </div>

          <ul className="mt-5 space-y-2">
            <ReadinessItem
              tone={
                selectedJob
                  ? selectedJobLaunchable
                    ? "ready"
                    : "blocked"
                  : "attention"
              }
            >
              {selectedJob
                ? selectedJobLaunchable
                  ? "Role is open for launch."
                  : "Role is not launchable."
                : "Select a role."}
            </ReadinessItem>
            <ReadinessItem
              tone={
                selectedCandidate
                  ? selectedCandidate.hasResume
                    ? "ready"
                    : "attention"
                  : "attention"
              }
            >
              {selectedCandidate
                ? selectedCandidate.hasResume
                  ? "Candidate resume is ready."
                  : "Resume is missing."
                : "Select a candidate."}
            </ReadinessItem>
            <ReadinessItem
              tone={
                selectedCandidate
                  ? hasContact
                    ? "ready"
                    : "attention"
                  : "attention"
              }
            >
              {selectedCandidate
                ? hasContact
                  ? "Candidate contact is available."
                  : "Candidate contact is missing."
                : "Contact readiness appears after candidate selection."}
            </ReadinessItem>
            <ReadinessItem
              tone={selectedJob?.clientName ? "ready" : "attention"}
            >
              {selectedJob?.clientName
                ? "Client context is attached."
                : "Client context is missing or pending."}
            </ReadinessItem>
            <ReadinessItem tone={selectedOwner ? "ready" : "attention"}>
              {selectedOwner
                ? `${getOwnerLabel(selectedOwner)} owns this opportunity.`
                : "Select an opportunity owner."}
            </ReadinessItem>
            <ReadinessItem
              tone={
                duplicateSubmission
                  ? "blocked"
                  : selectedCandidate && selectedJob
                    ? "ready"
                    : "attention"
              }
            >
              {duplicateSubmission ? (
                <>
                  Already in pipeline.{" "}
                  <TrackedLink
                    className="font-semibold underline underline-offset-4"
                    href={`/pipeline?jobId=${duplicateSubmission.jobId}&stage=${duplicateSubmission.stage}`}
                  >
                    View matching opportunity
                  </TrackedLink>
                  .
                </>
              ) : selectedCandidate && selectedJob ? (
                "No duplicate found in the loaded pipeline set."
              ) : (
                "Duplicate guard activates after role and candidate are selected."
              )}
            </ReadinessItem>
          </ul>
        </aside>
      </section>

      {error ? <p className="status-message status-error">{error}</p> : null}

      {!hasCandidates || !hasJobs || !hasOwners ? (
        <p className="status-message border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300">
          Launch needs at least one job, one candidate, and one workspace member
          owner.
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="submit"
          className="max-w-full rounded-full"
          disabled={isPending || !canSubmit}
        >
          {isPending ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Launching...
            </>
          ) : (
            getLaunchButtonLabel(selectedCandidate, selectedJob)
          )}
        </Button>
        <Button
          asChild
          type="button"
          variant="outline"
          className="rounded-full"
        >
          <TrackedLink href={cancelHref}>Cancel</TrackedLink>
        </Button>
      </div>
    </form>
  );
};
