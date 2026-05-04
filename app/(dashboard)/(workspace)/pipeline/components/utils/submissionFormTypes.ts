import type {
  ApiJobStatus,
  ApiRiskFlag,
  ApiSubmissionStage,
  ApiUserReference,
} from "@recruitflow/contracts";

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

export type ReadinessTone = "attention" | "blocked" | "ready";
export type OpportunityPairStatus = "blocked" | "idle" | "partial" | "ready";
export type OpportunityPanelTone = "blocked" | "idle" | "partial" | "ready";

export const launchStageValues = [
  "sourced",
  "screening",
  "submitted",
] as const satisfies readonly ApiSubmissionStage[];

export const stageLabelMap: Record<ApiSubmissionStage, string> = {
  client_interview: "Client interview",
  lost: "Lost",
  offer: "Offer",
  placed: "Placed",
  screening: "Screening",
  sourced: "Sourced",
  submitted: "Submitted",
};

export const stageDescriptionMap: Record<
  (typeof launchStageValues)[number],
  string
> = {
  screening: "Recruiter is qualifying fit before client handoff.",
  sourced: "Opportunity has been identified and needs first action.",
  submitted: "Candidate is ready to be sent to the client.",
};

export const riskOptions = [
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

export const isLaunchableJobStatus = (status: ApiJobStatus) =>
  !["closed", "filled"].includes(status);

export const getJobSelectLabel = (job: SubmissionJobOption) =>
  `${job.title}${job.clientName ? ` - ${job.clientName}` : ""}${
    isLaunchableJobStatus(job.status) ? "" : ` (${job.status})`
  }`;

export const getCandidateSelectLabel = (candidate: SubmissionCandidateOption) =>
  `${candidate.name}${candidate.headline ? ` - ${candidate.headline}` : ""}`;

export const getCandidateFocus = (candidate: SubmissionCandidateOption) =>
  [candidate.currentTitle, candidate.currentCompany]
    .filter(Boolean)
    .join(" at ") ||
  candidate.headline ||
  "Candidate context pending";

export const getOwnerLabel = (owner: ApiUserReference | null | undefined) =>
  owner ? (owner.name ?? owner.email) : "Owner not selected";

export const getCandidateFirstName = (name: string) =>
  name.trim().split(/\s+/)[0] ?? "";

export const getLaunchButtonLabel = (
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
