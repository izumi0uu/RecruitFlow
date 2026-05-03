"use client";

import {
  type ApiJobStatus,
  type ApiRiskFlag,
  type ApiSubmissionStage,
  type ApiUserReference,
  apiDefaultJobStageTemplate,
  type SubmissionRecord,
} from "@recruitflow/contracts";
import {
  Activity,
  BriefcaseBusiness,
  CalendarClock,
  CircleDollarSign,
  ExternalLink,
  Flag,
  Link2,
  UserRound,
} from "lucide-react";
import type { ReactNode } from "react";

import { TrackedLink } from "@/components/navigation/TrackedLink";
import { Button } from "@/components/ui/Button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/Dialog";
import { cn } from "@/lib/utils";
import { QuickTaskPanel } from "../../tasks/components/QuickTaskPanel";
import {
  PipelineNextStepControl,
  PipelineRiskControl,
} from "./PipelineFollowUpControls";
import { PipelineStageActions } from "./PipelineStageActions";

type PipelineSubmissionDetailPanelProps = {
  canChangeStage: boolean;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  ownerOptions: ApiUserReference[];
  submission: SubmissionRecord | null;
};

const stageLabelMap = Object.fromEntries(
  apiDefaultJobStageTemplate.map((stage) => [stage.key, stage.label]),
) as Record<ApiSubmissionStage, string>;

const stageToneClassMap: Record<ApiSubmissionStage, string> = {
  client_interview: "bg-sky-500",
  lost: "bg-slate-400",
  offer: "bg-violet-500",
  placed: "bg-emerald-500",
  screening: "bg-amber-500",
  sourced: "bg-zinc-500",
  submitted: "bg-cyan-500",
};

const riskLabelMap: Record<ApiRiskFlag, string> = {
  compensation_risk: "Compensation",
  feedback_risk: "Feedback",
  fit_risk: "Fit",
  none: "Clear",
  timing_risk: "Timing",
};

const jobStatusLabelMap: Record<ApiJobStatus, string> = {
  closed: "Closed",
  filled: "Filled",
  intake: "Intake",
  on_hold: "On hold",
  open: "Open",
};

const formatDateTime = (value: string | null) => {
  if (!value) {
    return "Not captured";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Date pending";
  }

  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    month: "short",
  }).format(date);
};

const formatMoney = (amount: number | null, currency: string | null) => {
  if (amount === null) {
    return "Not captured";
  }

  return new Intl.NumberFormat("en", {
    currency: currency ?? "USD",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(amount);
};

const getOwnerLabel = (submission: SubmissionRecord) =>
  submission.owner?.name ?? submission.owner?.email ?? "Unassigned";

const getCandidateTitle = (submission: SubmissionRecord) =>
  submission.candidate?.fullName ?? "Unknown candidate";

const getCandidateSubtitle = (submission: SubmissionRecord) =>
  [submission.candidate?.currentTitle, submission.candidate?.currentCompany]
    .filter(Boolean)
    .join(" at ") ||
  submission.candidate?.headline ||
  submission.candidate?.source ||
  "Candidate context pending";

const getRoleTitle = (submission: SubmissionRecord) =>
  submission.job?.title ?? "Unknown role";

const getClientName = (submission: SubmissionRecord) =>
  submission.job?.client?.name ?? "Client pending";

const getTouchValue = (submission: SubmissionRecord) =>
  submission.lastTouchAt ?? submission.updatedAt ?? submission.createdAt;

const DetailSection = ({
  children,
  className,
  icon,
  title,
}: {
  children: ReactNode;
  className?: string;
  icon: ReactNode;
  title: string;
}) => (
  <section
    className={cn(
      "rounded-[1.2rem] border border-border/70 bg-background/62 p-4",
      className,
    )}
  >
    <div className="flex items-center gap-2">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-[0.85rem] border border-border/70 bg-workspace-muted-surface/72 text-muted-foreground">
        {icon}
      </span>
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
    </div>
    <div className="mt-4">{children}</div>
  </section>
);

const FactRow = ({ label, value }: { label: string; value: ReactNode }) => (
  <div className="flex items-start justify-between gap-4 border-t border-border/60 py-3 first:border-t-0 first:pt-0 last:pb-0">
    <span className="text-xs font-medium text-muted-foreground">{label}</span>
    <span className="max-w-[62%] text-right text-sm font-medium text-foreground">
      {value}
    </span>
  </div>
);

export const PipelineSubmissionDetailPanel = ({
  canChangeStage,
  onOpenChange,
  open,
  ownerOptions,
  submission,
}: PipelineSubmissionDetailPanelProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bottom-0 left-auto right-0 top-0 h-dvh max-h-dvh w-[min(100vw,52rem)] max-w-none translate-x-0 translate-y-0 overflow-y-auto rounded-none border-y-0 border-r-0 p-0 data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:rounded-l-[1.35rem]">
        {!submission ? (
          <div className="flex min-h-dvh flex-col justify-center px-6 py-12 sm:px-8">
            <DialogHeader>
              <DialogTitle>Opportunity not visible</DialogTitle>
              <DialogDescription>
                The selected submission is outside the current pipeline result
                set.
              </DialogDescription>
            </DialogHeader>
            <div className="mt-6">
              <DialogClose asChild>
                <Button className="rounded-full">Return to pipeline</Button>
              </DialogClose>
            </div>
          </div>
        ) : (
          <div className="min-h-dvh bg-surface-2/50">
            <div className="border-b border-border/70 bg-background/82 px-5 py-5 backdrop-blur-xl sm:px-7">
              <DialogHeader className="pr-12">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-workspace-muted-surface/72 px-2.5 py-1 text-xs font-semibold text-muted-foreground">
                    <span
                      className={cn(
                        "size-2 rounded-full",
                        stageToneClassMap[submission.stage],
                      )}
                    />
                    {stageLabelMap[submission.stage]}
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-workspace-muted-surface/72 px-2.5 py-1 text-xs font-semibold text-muted-foreground">
                    <Flag className="size-3.5" />
                    {riskLabelMap[submission.riskFlag]}
                  </span>
                </div>
                <DialogTitle className="text-2xl sm:text-3xl">
                  {getCandidateTitle(submission)}
                </DialogTitle>
                <DialogDescription>
                  {getRoleTitle(submission)} at {getClientName(submission)}
                </DialogDescription>
              </DialogHeader>
            </div>

            <div className="grid gap-4 px-4 py-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
              <main className="space-y-4">
                <DetailSection
                  icon={<UserRound className="size-4" />}
                  title="Candidate context"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-base font-semibold text-foreground">
                        {getCandidateTitle(submission)}
                      </p>
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">
                        {getCandidateSubtitle(submission)}
                      </p>
                    </div>
                    <Button
                      asChild
                      className="shrink-0 rounded-full"
                      size="sm"
                      variant="outline"
                    >
                      <TrackedLink
                        href={`/candidates/${submission.candidateId}`}
                      >
                        <ExternalLink className="size-3.5" />
                        Candidate
                      </TrackedLink>
                    </Button>
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-[1rem] border border-border/65 bg-workspace-muted-surface/52 px-3 py-3">
                      <p className="text-xs font-medium text-muted-foreground">
                        Source
                      </p>
                      <p className="mt-1 text-sm font-medium text-foreground">
                        {submission.candidate?.source ?? "Not captured"}
                      </p>
                    </div>
                    <div className="rounded-[1rem] border border-border/65 bg-workspace-muted-surface/52 px-3 py-3">
                      <p className="text-xs font-medium text-muted-foreground">
                        Headline
                      </p>
                      <p className="mt-1 line-clamp-2 text-sm font-medium text-foreground">
                        {submission.candidate?.headline ?? "Not captured"}
                      </p>
                    </div>
                  </div>
                </DetailSection>

                <DetailSection
                  icon={<BriefcaseBusiness className="size-4" />}
                  title="Role context"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-base font-semibold text-foreground">
                        {getRoleTitle(submission)}
                      </p>
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">
                        {getClientName(submission)}
                      </p>
                    </div>
                    <Button
                      asChild
                      className="shrink-0 rounded-full"
                      size="sm"
                      variant="outline"
                    >
                      <TrackedLink href={`/jobs/${submission.jobId}`}>
                        <ExternalLink className="size-3.5" />
                        Job
                      </TrackedLink>
                    </Button>
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-[1rem] border border-border/65 bg-workspace-muted-surface/52 px-3 py-3">
                      <p className="text-xs font-medium text-muted-foreground">
                        Job status
                      </p>
                      <p className="mt-1 text-sm font-medium text-foreground">
                        {submission.job
                          ? jobStatusLabelMap[submission.job.status]
                          : "Not captured"}
                      </p>
                    </div>
                    <div className="rounded-[1rem] border border-border/65 bg-workspace-muted-surface/52 px-3 py-3">
                      <p className="text-xs font-medium text-muted-foreground">
                        Client
                      </p>
                      <p className="mt-1 text-sm font-medium text-foreground">
                        {getClientName(submission)}
                      </p>
                    </div>
                  </div>
                </DetailSection>

                <DetailSection
                  icon={<Link2 className="size-4" />}
                  title="Next action"
                >
                  <PipelineNextStepControl
                    canUpdate={canChangeStage}
                    nextStep={submission.nextStep}
                    submissionId={submission.id}
                  />
                </DetailSection>

                <DetailSection
                  icon={<Activity className="size-4" />}
                  title="Timeline signals"
                >
                  <div>
                    <FactRow
                      label="Created"
                      value={formatDateTime(submission.createdAt)}
                    />
                    <FactRow
                      label="Submitted"
                      value={formatDateTime(submission.submittedAt)}
                    />
                    <FactRow
                      label="Last touch"
                      value={formatDateTime(getTouchValue(submission))}
                    />
                    <FactRow
                      label="Latest feedback"
                      value={formatDateTime(submission.latestFeedbackAt)}
                    />
                    <FactRow
                      label="Updated"
                      value={formatDateTime(submission.updatedAt)}
                    />
                  </div>
                </DetailSection>
              </main>

              <aside className="space-y-4">
                <DetailSection
                  icon={<Flag className="size-4" />}
                  title="Work state"
                >
                  <div className="space-y-4">
                    <PipelineRiskControl
                      canUpdate={canChangeStage}
                      riskFlag={submission.riskFlag}
                      submissionId={submission.id}
                    />
                    <PipelineStageActions
                      canChangeStage={canChangeStage}
                      currentStage={submission.stage}
                      submissionId={submission.id}
                    />
                  </div>
                </DetailSection>

                <DetailSection
                  icon={<UserRound className="size-4" />}
                  title="Ownership"
                >
                  <FactRow label="Owner" value={getOwnerLabel(submission)} />
                  <FactRow
                    label="Permission"
                    value={canChangeStage ? "Editable" : "Read-only"}
                  />
                </DetailSection>

                <QuickTaskPanel
                  defaultAssignedToUserId={submission.ownerUserId}
                  entity={{
                    entityId: submission.id,
                    entityType: "submission",
                    label: getCandidateTitle(submission),
                    secondaryLabel: getRoleTitle(submission),
                    trail: [
                      "Submission",
                      getClientName(submission),
                      getRoleTitle(submission),
                      getCandidateTitle(submission),
                    ],
                  }}
                  ownerOptions={ownerOptions}
                  title="Submission tasks"
                />

                <DetailSection
                  icon={<CircleDollarSign className="size-4" />}
                  title="Outcome fields"
                >
                  <FactRow
                    label="Offer"
                    value={formatMoney(
                      submission.offerAmount,
                      submission.currency,
                    )}
                  />
                  <FactRow
                    label="Lost reason"
                    value={submission.lostReason ?? "Not captured"}
                  />
                  <FactRow
                    label="Currency"
                    value={submission.currency ?? "Not captured"}
                  />
                </DetailSection>

                <DetailSection
                  icon={<CalendarClock className="size-4" />}
                  title="Record"
                >
                  <FactRow
                    label="Submission"
                    value={submission.id.slice(0, 8)}
                  />
                  <FactRow
                    label="Candidate"
                    value={submission.candidateId.slice(0, 8)}
                  />
                  <FactRow label="Job" value={submission.jobId.slice(0, 8)} />
                </DetailSection>
              </aside>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
