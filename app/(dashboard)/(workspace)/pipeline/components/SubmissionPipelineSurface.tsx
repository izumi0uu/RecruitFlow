"use client";

import * as React from "react";
import {
  ArrowRight,
  BriefcaseBusiness,
  CheckCircle2,
  LayoutGrid,
  Loader2,
  RefreshCcw,
  RotateCcw,
  Search,
  ShieldAlert,
  Sparkles,
  TrendingUp,
  UserRound,
  Users,
} from "lucide-react";

import type {
  ApiRiskFlag,
  ApiSubmissionStage,
  SubmissionRecord,
  SubmissionsListResponse,
} from "@recruitflow/contracts";
import { apiDefaultJobStageTemplate } from "@recruitflow/contracts";

import { TrackedLink } from "@/components/navigation/TrackedLink";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { FilterSelect } from "@/components/ui/FilterSelect";
import { Input } from "@/components/ui/Input";
import { WorkspaceListStatusBadge } from "@/components/workspace/WorkspaceListSurfaceShell";
import { WorkspacePageHeader } from "@/components/workspace/WorkspacePageHeader";
import { WorkspacePageHeaderSummary } from "@/components/workspace/WorkspacePageHeaderSummary";
import { cn } from "@/lib/utils";
import type { SubmissionPipelineFilters } from "@/lib/submissions/filters";

import { useSubmissionPipelineSurface } from "./hooks/useSubmissionPipelineSurface";

const stageToneClassMap: Record<ApiSubmissionStage, string> = {
  client_interview:
    "border-sky-500/25 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  lost: "border-rose-500/25 bg-rose-500/10 text-rose-700 dark:text-rose-300",
  offer: "border-violet-500/25 bg-violet-500/10 text-violet-700 dark:text-violet-300",
  placed:
    "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  screening:
    "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  sourced:
    "border-border/70 bg-surface-1 text-muted-foreground dark:bg-surface-1/75",
  submitted:
    "border-indigo-500/25 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300",
};

const riskLabelMap: Record<ApiRiskFlag, string> = {
  none: "Healthy",
  timing_risk: "Timing risk",
  feedback_risk: "Feedback risk",
  compensation_risk: "Comp risk",
  fit_risk: "Fit risk",
};

const riskToneClassMap: Record<ApiRiskFlag, string> = {
  none: "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  timing_risk:
    "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  feedback_risk:
    "border-sky-500/25 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  compensation_risk:
    "border-violet-500/25 bg-violet-500/10 text-violet-700 dark:text-violet-300",
  fit_risk:
    "border-rose-500/25 bg-rose-500/10 text-rose-700 dark:text-rose-300",
};

const stageOptions = [
  { label: "All stages", value: "" },
  ...apiDefaultJobStageTemplate.map((stage) => ({
    label: stage.label,
    value: stage.key,
  })),
];

const riskOptions = [
  { label: "All risk", value: "" },
  { label: "Healthy", value: "none" },
  { label: "Timing risk", value: "timing_risk" },
  { label: "Feedback risk", value: "feedback_risk" },
  { label: "Comp risk", value: "compensation_risk" },
  { label: "Fit risk", value: "fit_risk" },
];

const activeStageSet = new Set<ApiSubmissionStage>([
  "sourced",
  "screening",
  "submitted",
  "client_interview",
  "offer",
]);

const clientFacingStageSet = new Set<ApiSubmissionStage>([
  "submitted",
  "client_interview",
  "offer",
]);

const outcomeStageSet = new Set<ApiSubmissionStage>(["placed", "lost"]);

const formatSubmissionDate = (value: string | null) => {
  if (!value) {
    return "No touch yet";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unknown date";
  }

  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    month: "short",
    day: "numeric",
  }).format(date);
};

const formatRelativeTouch = (value: string | null) => {
  if (!value) {
    return "No touch yet";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unknown date";
  }

  const now = new Date();
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  );
  const startOfTarget = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  );
  const diffInDays = Math.round(
    (startOfTarget.getTime() - startOfToday.getTime()) / 86_400_000,
  );

  if (diffInDays === 0) {
    return "Today";
  }

  if (diffInDays === -1) {
    return "Yesterday";
  }

  if (diffInDays === 1) {
    return "Tomorrow";
  }

  if (diffInDays < 0) {
    return `${Math.abs(diffInDays)}d ago`;
  }

  return `In ${diffInDays}d`;
};

const getOwnerLabel = (submission: SubmissionRecord) => {
  return submission.owner?.name ?? submission.owner?.email ?? "Unassigned";
};

const getCandidateFocus = (submission: SubmissionRecord) => {
  const parts = [
    submission.candidate?.currentTitle,
    submission.candidate?.currentCompany,
  ].filter(Boolean);

  return parts.join(" at ") || submission.candidate?.headline || "Candidate context pending";
};

const getJobLabel = (submission: SubmissionRecord) => {
  return submission.job?.title ?? "Unknown role";
};

const getClientLabel = (submission: SubmissionRecord) => {
  return submission.job?.client?.name ?? "Unknown client";
};

const getStageCounts = (items: SubmissionRecord[]) => {
  const counts = new Map<ApiSubmissionStage, number>();

  apiDefaultJobStageTemplate.forEach((stage) => {
    counts.set(stage.key, 0);
  });

  items.forEach((submission) => {
    counts.set(submission.stage, (counts.get(submission.stage) ?? 0) + 1);
  });

  return counts;
};

const getActiveCount = (items: SubmissionRecord[]) =>
  items.filter((submission) => activeStageSet.has(submission.stage)).length;

const getAttentionCount = (items: SubmissionRecord[]) =>
  items.filter((submission) => submission.riskFlag !== "none").length;

const getClientFacingCount = (items: SubmissionRecord[]) =>
  items.filter((submission) => clientFacingStageSet.has(submission.stage))
    .length;

const getOutcomeCount = (items: SubmissionRecord[]) =>
  items.filter((submission) => outcomeStageSet.has(submission.stage)).length;

const getScopeBadgeValue = (
  filters: {
    candidateId: string;
    clientId: string;
    jobId: string;
    owner: string;
    risk: string;
    stage: string;
  },
  items: SubmissionRecord[],
) => {
  return [
    filters.jobId
      ? {
          label: "Job",
          value: (() => {
            const matchingSubmission = items.find(
              (item) => item.jobId === filters.jobId,
            );

            return matchingSubmission
              ? getJobLabel(matchingSubmission)
              : "Job scope active";
          })(),
        }
      : null,
    filters.candidateId
      ? {
          label: "Candidate",
          value: (() => {
            const matchingSubmission = items.find(
              (item) => item.candidateId === filters.candidateId,
            );

            return matchingSubmission?.candidate?.fullName ?? "Candidate scope active";
          })(),
        }
      : null,
    filters.clientId
      ? {
          label: "Client",
          value: (() => {
            const matchingSubmission = items.find(
              (item) => item.job?.clientId === filters.clientId,
            );

            return matchingSubmission
              ? getClientLabel(matchingSubmission)
              : "Client scope active";
          })(),
        }
      : null,
    filters.owner
      ? {
          label: "Owner",
          value: (() => {
            const matchingSubmission = items.find(
              (item) => item.owner?.id === filters.owner,
            );

            return matchingSubmission
              ? getOwnerLabel(matchingSubmission)
              : "Owner scope active";
          })(),
        }
      : null,
    filters.stage
      ? {
          label: "Stage",
          value:
            stageOptions.find((stage) => stage.value === filters.stage)?.label ??
            "Stage scope active",
        }
      : null,
    filters.risk
      ? {
          label: "Risk",
          value:
            riskLabelMap[filters.risk as ApiRiskFlag] ?? "Risk scope active",
        }
      : null,
  ].filter(Boolean) as Array<{ label: string; value: string }>;
};

const PipelineMetricCard = ({
  description,
  icon,
  tone,
  title,
  value,
}: {
  description: string;
  icon: React.ReactNode;
  tone: string;
  title: string;
  value: number;
}) => (
  <div className="rounded-[1.45rem] border border-border/70 bg-background/58 p-4">
    <div className="flex items-center justify-between gap-3">
      <div>
        <p className="text-[0.66rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          {title}
        </p>
        <p className="mt-2 text-2xl font-semibold tracking-[-0.05em] text-foreground">
          {value}
        </p>
      </div>
      <span
        className={cn(
          "flex size-10 items-center justify-center rounded-[1rem] border",
          tone,
        )}
      >
        {icon}
      </span>
    </div>
    <p className="mt-3 text-sm leading-6 text-muted-foreground">
      {description}
    </p>
  </div>
);

const PipelinePill = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <span
    className={cn(
      "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold",
      className,
    )}
  >
    {children}
  </span>
);

const PipelineField = ({
  label,
  value,
}: {
  label: string;
  value: string;
}) => (
  <div className="rounded-[1rem] border border-border/60 bg-background/52 px-3 py-2">
    <p className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
      {label}
    </p>
    <p className="mt-1 truncate text-sm font-medium text-foreground">{value}</p>
  </div>
);

const PipelineBoardCard = ({ submission }: { submission: SubmissionRecord }) => (
  <article className="rounded-[1.4rem] border border-border/70 bg-background/82 p-4 shadow-[0_20px_48px_-40px_var(--shadow-color)]">
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-[0.66rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Candidate
        </p>
        <TrackedLink
          href={`/candidates/${submission.candidateId}`}
          className="mt-2 block truncate text-sm font-semibold tracking-[-0.03em] text-foreground transition hover:text-primary"
        >
          {submission.candidate?.fullName ?? "Unknown candidate"}
        </TrackedLink>
        <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
          {getCandidateFocus(submission)}
        </p>
      </div>

      <PipelinePill className={riskToneClassMap[submission.riskFlag]}>
        {riskLabelMap[submission.riskFlag]}
      </PipelinePill>
    </div>

    <div className="mt-4 space-y-3">
      <div className="rounded-[1.1rem] border border-border/60 bg-surface-1/58 p-3">
        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Role
        </p>
        <TrackedLink
          href={`/jobs/${submission.jobId}`}
          className="mt-2 block truncate text-sm font-semibold text-foreground transition hover:text-primary"
        >
          {getJobLabel(submission)}
        </TrackedLink>
        <p className="mt-1 truncate text-xs leading-5 text-muted-foreground">
          {getClientLabel(submission)}
        </p>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <PipelineField label="Owner" value={getOwnerLabel(submission)} />
        <PipelineField
          label="Last touch"
          value={formatRelativeTouch(submission.lastTouchAt)}
        />
      </div>

      <div className="rounded-[1.1rem] border border-border/60 bg-background/58 p-3">
        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Next step
        </p>
        <p className="mt-2 line-clamp-3 text-sm leading-6 text-foreground">
          {submission.nextStep ?? "No next step set"}
        </p>
      </div>
    </div>
  </article>
);

const PipelineBoardColumn = ({
  count,
  submissionItems,
  stage,
}: {
  count: number;
  stage: (typeof apiDefaultJobStageTemplate)[number];
  submissionItems: SubmissionRecord[];
}) => (
  <section
    className={cn(
      "flex min-h-[22rem] min-w-[15rem] flex-col rounded-[1.55rem] border p-3",
      stage.isClosedStage
        ? "border-border/60 bg-surface-1/55"
        : "border-border/70 bg-background/55",
    )}
  >
    <div className="flex items-start justify-between gap-3 px-1">
      <div className="min-w-0">
        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Stage {stage.sortOrder}
        </p>
        <h3 className="mt-1 text-base font-semibold tracking-[-0.03em] text-foreground">
          {stage.label}
        </h3>
      </div>
      <PipelinePill className={stageToneClassMap[stage.key]}>{count}</PipelinePill>
    </div>

    <div className="mt-3 flex flex-1 flex-col gap-3">
      {submissionItems.length > 0 ? (
        submissionItems.map((submission) => (
          <PipelineBoardCard key={submission.id} submission={submission} />
        ))
      ) : (
        <div className="flex flex-1 items-center justify-center rounded-[1.25rem] border border-dashed border-border/60 bg-background/32 px-4 py-8 text-center">
          <div className="max-w-xs">
            <p className="text-sm font-medium text-foreground">
              No submissions yet
            </p>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              This lane stays intentionally empty until the pipeline reaches{" "}
              {stage.label.toLowerCase()}.
            </p>
          </div>
        </div>
      )}
    </div>
  </section>
);

const PipelineBoard = ({
  items,
}: {
  items: SubmissionRecord[];
}) => {
  const stageCounts = getStageCounts(items);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {apiDefaultJobStageTemplate.map((stage) => (
          <PipelinePill
            key={stage.key}
            className={cn(
              "border-border/70 bg-background/65 text-muted-foreground",
              stageToneClassMap[stage.key],
            )}
          >
            {stage.label}: {stageCounts.get(stage.key) ?? 0}
          </PipelinePill>
        ))}
      </div>

      <div className="overflow-x-auto pb-1">
        <div className="grid min-w-[114rem] gap-4 xl:grid-cols-7">
          {apiDefaultJobStageTemplate.map((stage) => (
            <PipelineBoardColumn
              key={stage.key}
              count={stageCounts.get(stage.key) ?? 0}
              stage={stage}
              submissionItems={items.filter(
                (submission) => submission.stage === stage.key,
              )}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

const PipelineListRow = ({ submission }: { submission: SubmissionRecord }) => (
  <article className="grid gap-4 border-t border-border/60 px-4 py-4 first:border-t-0 md:px-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(8rem,0.42fr)_minmax(10rem,0.42fr)_minmax(0,1fr)_minmax(8rem,0.42fr)_minmax(8.5rem,0.38fr)] lg:items-start">
    <div className="min-w-0">
      <div className="flex flex-wrap items-center gap-2">
        <PipelinePill className={riskToneClassMap[submission.riskFlag]}>
          {riskLabelMap[submission.riskFlag]}
        </PipelinePill>
        <PipelinePill className={stageToneClassMap[submission.stage]}>
          {stageOptions.find((stage) => stage.value === submission.stage)?.label ??
            submission.stage}
        </PipelinePill>
      </div>

      <TrackedLink
        href={`/candidates/${submission.candidateId}`}
        className="mt-3 block truncate text-lg font-semibold tracking-[-0.04em] text-foreground transition hover:text-primary"
      >
        {submission.candidate?.fullName ?? "Unknown candidate"}
      </TrackedLink>
      <p className="mt-1 text-sm leading-6 text-muted-foreground">
        {getCandidateFocus(submission)}
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <TrackedLink
          href={`/jobs/${submission.jobId}`}
          className="font-medium text-foreground transition hover:text-primary"
        >
          {getJobLabel(submission)}
        </TrackedLink>
        <span>·</span>
        <span>{getClientLabel(submission)}</span>
      </div>
    </div>

    <div className="rounded-[1.2rem] border border-border/65 bg-background/52 px-3 py-3">
      <p className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        Owner
      </p>
      <div className="mt-3 flex items-center gap-3">
        <span className="flex size-9 items-center justify-center rounded-full border border-border/70 bg-surface-1">
          <UserRound className="size-4 text-muted-foreground" />
        </span>
        <p className="min-w-0 truncate text-sm font-medium text-foreground">
          {getOwnerLabel(submission)}
        </p>
      </div>
    </div>

    <div className="rounded-[1.2rem] border border-border/65 bg-background/52 px-3 py-3">
      <p className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        Next step
      </p>
      <p className="mt-3 line-clamp-4 text-sm leading-6 text-foreground">
        {submission.nextStep ?? "No next step set"}
      </p>
    </div>

    <div className="rounded-[1.2rem] border border-border/65 bg-background/52 px-3 py-3">
      <p className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        Candidate + role
      </p>
      <div className="mt-3 space-y-2 text-sm leading-6 text-foreground">
        <p className="truncate font-medium">{submission.candidate?.headline ?? submission.candidate?.currentTitle ?? "No headline yet"}</p>
        <p className="truncate text-muted-foreground">{formatSubmissionDate(submission.lastTouchAt)}</p>
      </div>
    </div>

    <div className="rounded-[1.2rem] border border-border/65 bg-background/52 px-3 py-3">
      <p className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        Risk
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <PipelinePill className={riskToneClassMap[submission.riskFlag]}>
          {riskLabelMap[submission.riskFlag]}
        </PipelinePill>
      </div>
    </div>

    <div className="rounded-[1.2rem] border border-border/65 bg-background/52 px-3 py-3">
      <p className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        Last touch
      </p>
      <p className="mt-3 text-sm font-medium text-foreground">
        {formatRelativeTouch(submission.lastTouchAt)}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        {submission.lastTouchAt
          ? formatSubmissionDate(submission.lastTouchAt)
          : "No touch recorded"}
      </p>
    </div>
  </article>
);

const PipelineList = ({ items }: { items: SubmissionRecord[] }) => (
  <div className="overflow-hidden rounded-[1.55rem] border border-border/70 bg-background/42">
    <div className="hidden gap-4 border-b border-border/60 bg-workspace-muted-surface/55 px-5 py-3 text-[0.66rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground lg:grid lg:grid-cols-[minmax(0,1.35fr)_minmax(8rem,0.42fr)_minmax(10rem,0.42fr)_minmax(0,1fr)_minmax(8rem,0.42fr)_minmax(8.5rem,0.38fr)]">
      <span>Candidate / role</span>
      <span>Owner</span>
      <span>Next step</span>
      <span>Context</span>
      <span>Risk</span>
      <span>Last touch</span>
    </div>

    <div>{items.map((submission) => (
      <PipelineListRow key={submission.id} submission={submission} />
    ))}</div>
  </div>
);

const PipelineEmptyState = ({
  canLaunchOpportunity,
  hasFilters,
  onReset,
}: {
  canLaunchOpportunity: boolean;
  hasFilters: boolean;
  onReset: () => void;
}) => (
  <div className="rounded-[1.55rem] border border-dashed border-border/75 bg-background/38 px-6 py-14 text-center">
    <span className="mx-auto flex size-14 items-center justify-center rounded-[1.35rem] border border-border/70 bg-surface-1">
      <Sparkles className="size-5 text-foreground" />
    </span>
    <h2 className="mt-5 text-xl font-semibold tracking-[-0.04em] text-foreground">
      {hasFilters ? "No matching submissions" : "No submissions yet"}
    </h2>
    <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
      {hasFilters
        ? "Try loosening the search or filters. The pipeline stays workspace-scoped, but the current result set is empty."
        : "Launch the first opportunity from a job or candidate context so the pipeline has a real operating card to show."}
    </p>
    {hasFilters ? (
      <Button
        className="mt-6 rounded-full"
        type="button"
        variant="outline"
        onClick={onReset}
      >
        <RotateCcw className="size-4" />
        Reset filters
      </Button>
    ) : canLaunchOpportunity ? (
      <Button asChild className="mt-6 rounded-full">
        <TrackedLink href="/pipeline/new?returnTo=pipeline">
          Launch opportunity
          <ArrowRight className="size-4" />
        </TrackedLink>
      </Button>
    ) : null}
  </div>
);

const SubmissionPipelineSurface = ({
  initialData,
  initialFilters,
}: {
  initialData: SubmissionsListResponse;
  initialFilters: SubmissionPipelineFilters;
}) => {
  const {
    applyFilters,
    canLaunchOpportunity,
    currentView,
    error,
    filterCount,
    filters,
    hasFilters,
    isError,
    isFetching,
    refetch,
    resetFilters,
    searchDraft,
    setSearchDraft,
    submissionCreated,
    submissionsList,
  } = useSubmissionPipelineSurface({
    initialData,
    initialFilters,
  });

  const ownerOptions = React.useMemo(
    () => [
      { label: "All owners", value: "" },
      ...submissionsList.ownerOptions.map((owner) => ({
        label: owner.name ?? owner.email,
        value: owner.id,
      })),
    ],
    [submissionsList.ownerOptions],
  );
  const activeCount = getActiveCount(submissionsList.items);
  const attentionCount = getAttentionCount(submissionsList.items);
  const clientFacingCount = getClientFacingCount(submissionsList.items);
  const outcomeCount = getOutcomeCount(submissionsList.items);
  const scopeBadges = getScopeBadgeValue(filters, submissionsList.items);

  return (
    <section className="space-y-6 px-0 py-1 lg:py-2">
      <WorkspacePageHeader
        kicker="Submission pipeline"
        title="Pipeline"
        description="Monitor candidate-role opportunities across the active workspace, then switch between board and dense list views as the operating context changes."
        rightSlot={
          <WorkspacePageHeaderSummary
            actionDisabled={!canLaunchOpportunity}
            actionHref="/pipeline/new?returnTo=pipeline"
            actionLabel="Launch opportunity"
            role={submissionsList.context.role}
            totalItems={submissionsList.pagination.totalItems}
            visibleItems={submissionsList.items.length}
          />
        }
      />

      <Card className="rounded-[2.2rem]">
        <CardContent className="space-y-6 pt-1">
          <div className="rounded-[1.7rem] border border-border/70 bg-workspace-muted-surface/48 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]">
            <div className="flex flex-wrap items-center gap-2">
              <WorkspaceListStatusBadge>
                {submissionsList.workspaceScoped
                  ? "Workspace scoped"
                  : "Scope pending"}
              </WorkspaceListStatusBadge>
              <WorkspaceListStatusBadge>
                {currentView === "board" ? "Board view" : "List view"}
              </WorkspaceListStatusBadge>
              <WorkspaceListStatusBadge>
                {filterCount ? `${filterCount} active filters` : "No filters"}
              </WorkspaceListStatusBadge>
              {isFetching ? (
                <WorkspaceListStatusBadge>
                  <Loader2 className="size-3.5 animate-spin" />
                  Syncing
                </WorkspaceListStatusBadge>
              ) : null}
              {submissionsList.context.role === "coordinator" ? (
                <WorkspaceListStatusBadge>
                  Read only
                </WorkspaceListStatusBadge>
              ) : null}
              {submissionCreated ? (
                <WorkspaceListStatusBadge className="border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                  Opportunity launched
                </WorkspaceListStatusBadge>
              ) : null}
            </div>

            <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1.16fr)_repeat(3,minmax(0,0.72fr))_auto]">
              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Search
                </span>
                <span className="relative block">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    className="pl-9"
                    placeholder="Candidate, job, client, or next step"
                    value={searchDraft}
                    onChange={(event) => {
                      setSearchDraft(event.target.value);
                    }}
                  />
                </span>
              </label>

              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Owner
                </span>
                <FilterSelect
                  value={filters.owner}
                  options={ownerOptions}
                  placeholder="All owners"
                  onValueChange={(owner) => {
                    applyFilters({ owner });
                  }}
                />
              </label>

              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Stage
                </span>
                <FilterSelect
                  value={filters.stage}
                  options={stageOptions}
                  placeholder="All stages"
                  onValueChange={(stage) => {
                    applyFilters({ stage: stage as "" | ApiSubmissionStage });
                  }}
                />
              </label>

              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Risk
                </span>
                <FilterSelect
                  value={filters.risk}
                  options={riskOptions}
                  placeholder="All risk"
                  onValueChange={(risk) => {
                    applyFilters({ risk: risk as "" | ApiRiskFlag });
                  }}
                />
              </label>

              <div className="flex flex-wrap items-end gap-2">
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant={currentView === "board" ? "default" : "outline"}
                    className="rounded-full"
                    onClick={() => {
                      applyFilters({ view: "board" });
                    }}
                  >
                    <LayoutGrid className="size-4" />
                    Board
                  </Button>
                  <Button
                    type="button"
                    variant={currentView === "list" ? "default" : "outline"}
                    className="rounded-full"
                    onClick={() => {
                      applyFilters({ view: "list" });
                    }}
                  >
                    <Users className="size-4" />
                    List
                  </Button>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  className="rounded-full"
                  disabled={!hasFilters}
                  onClick={resetFilters}
                >
                  <RotateCcw className="size-4" />
                  Reset
                </Button>
              </div>
            </div>

            {scopeBadges.length > 0 ? (
              <div className="mt-4 flex flex-wrap items-center gap-2">
                {scopeBadges.map((badge) => (
                  <PipelinePill
                    key={`${badge.label}:${badge.value}`}
                    className="border-border/70 bg-background/68 text-muted-foreground"
                  >
                    <span className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      {badge.label}
                    </span>
                    <span className="ml-2 text-foreground">{badge.value}</span>
                  </PipelinePill>
                ))}
              </div>
            ) : null}
          </div>

          {submissionCreated ? (
            <div className="rounded-[1.45rem] border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-sm leading-6 text-emerald-700 dark:text-emerald-200">
              <p className="font-semibold">Opportunity launched.</p>
              <p className="mt-1">
                The candidate is now active for this role through the API-owned
                create flow.
              </p>
            </div>
          ) : null}

          {isError ? (
            <div className="rounded-[1.45rem] border border-destructive/20 bg-destructive/10 px-4 py-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Unable to refresh the pipeline.
                  </p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {error instanceof Error
                      ? error.message
                      : "The submissions API returned an unexpected error."}
                  </p>
                </div>
                <Button
                  className="rounded-full"
                  type="button"
                  variant="outline"
                  onClick={() => {
                    void refetch();
                  }}
                >
                  <RefreshCcw className="size-4" />
                  Retry
                </Button>
              </div>
            </div>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <PipelineMetricCard
              description="Open lanes that still need recruiter movement."
              icon={<TrendingUp className="size-4" />}
              tone="border-sky-500/25 bg-sky-500/10 text-sky-700 dark:text-sky-300"
              title="Active"
              value={activeCount}
            />
            <PipelineMetricCard
              description="Submissions carrying a risk marker."
              icon={<ShieldAlert className="size-4" />}
              tone="border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300"
              title="Attention"
              value={attentionCount}
            />
            <PipelineMetricCard
              description="Items that have reached client-facing stages."
              icon={<BriefcaseBusiness className="size-4" />}
              tone="border-indigo-500/25 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300"
              title="Client-facing"
              value={clientFacingCount}
            />
            <PipelineMetricCard
              description="Placed or lost outcomes recorded in the workspace."
              icon={<CheckCircle2 className="size-4" />}
              tone="border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
              title="Outcomes"
              value={outcomeCount}
            />
          </div>

          {submissionsList.items.length === 0 ? (
            <PipelineEmptyState
              canLaunchOpportunity={canLaunchOpportunity}
              hasFilters={hasFilters}
              onReset={resetFilters}
            />
          ) : currentView === "board" ? (
            <PipelineBoard items={submissionsList.items} />
          ) : (
            <PipelineList items={submissionsList.items} />
          )}

          <div className="rounded-[1.4rem] border border-border/70 bg-background/45 px-4 py-3 text-sm leading-6 text-muted-foreground">
            Showing {submissionsList.items.length} of{" "}
            {submissionsList.pagination.totalItems} submissions. The board and
            dense list share the same workspace-scoped result set.
          </div>
        </CardContent>
      </Card>
    </section>
  );
};

export { SubmissionPipelineSurface };
