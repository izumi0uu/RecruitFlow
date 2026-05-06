"use client";

import {
  type ApiSubmissionStage,
  apiDefaultJobStageTemplate,
  type SubmissionRecord,
  type SubmissionsListResponse,
} from "@recruitflow/contracts";
import {
  ArrowRight,
  Gauge,
  KanbanSquare,
  ListChecks,
  PanelRightOpen,
  Plus,
  RotateCcw,
  ShieldCheck,
} from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";

import { TrackedLink } from "@/components/navigation/TrackedLink";
import { Button } from "@/components/ui/Button";
import { WorkspacePageHeader } from "@/components/workspace/WorkspacePageHeader";
import { cn } from "@/lib/utils";

import { PipelineBoardView } from "./PipelineBoardView";
import { PipelineExportButton } from "./PipelineExportButton";
import {
  PipelineFilterControls,
  type PipelineFilterValues,
} from "./PipelineFilterControls";
import {
  PipelineNextStepControl,
  PipelineRiskControl,
} from "./PipelineFollowUpControls";
import { PipelineSubmissionDetailPanel } from "./PipelineSubmissionDetailPanel";

export type PipelineView = "board" | "list";

export type PipelineActiveFilter = {
  label: string;
  value: string;
};

type PipelineSurfaceProps = {
  activeFilters: PipelineActiveFilter[];
  boardHref: string;
  clientFilterOptionItems: SubmissionRecord[];
  filterValues: PipelineFilterValues;
  jobFilterOptionItems: SubmissionRecord[];
  listHref: string;
  resetHref: string;
  submissions: SubmissionsListResponse;
  submissionCreated: boolean;
  view: PipelineView;
};

type PipelineMetric = {
  detail: string;
  label: string;
  tone: string;
  value: ReactNode;
};

export type PipelineStageGroup = {
  description: string;
  isClosedStage: boolean;
  items: SubmissionRecord[];
  key: ApiSubmissionStage;
  label: string;
  riskCount: number;
  sortOrder: number;
};

const clientFacingStages = new Set<ApiSubmissionStage>([
  "submitted",
  "client_interview",
  "offer",
]);

const terminalStages = new Set<ApiSubmissionStage>(["lost", "placed"]);

const stageLabelMap = Object.fromEntries(
  apiDefaultJobStageTemplate.map((stage) => [stage.key, stage.label]),
) as Record<ApiSubmissionStage, string>;

const stageDescriptionMap: Record<ApiSubmissionStage, string> = {
  client_interview: "Interview loop",
  lost: "Closed loss",
  offer: "Commercial close",
  placed: "Won outcome",
  screening: "Agency qualification",
  sourced: "Newly identified",
  submitted: "Client handoff",
};

const stageAccentClassMap: Record<ApiSubmissionStage, string> = {
  client_interview: "bg-sky-500",
  lost: "bg-slate-400",
  offer: "bg-violet-500",
  placed: "bg-emerald-500",
  screening: "bg-amber-500",
  sourced: "bg-zinc-500",
  submitted: "bg-cyan-500",
};

const stageBorderClassMap: Record<ApiSubmissionStage, string> = {
  client_interview: "border-sky-500/30",
  lost: "border-slate-400/35",
  offer: "border-violet-500/30",
  placed: "border-emerald-500/30",
  screening: "border-amber-500/30",
  sourced: "border-zinc-500/30",
  submitted: "border-cyan-500/30",
};

const formatDate = (value: string | null) => {
  if (!value) {
    return "No touch yet";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Date pending";
  }

  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
  }).format(date);
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

const buildStageGroups = (items: SubmissionRecord[]): PipelineStageGroup[] =>
  apiDefaultJobStageTemplate.map((stage) => {
    const stageItems = items.filter(
      (submission) => submission.stage === stage.key,
    );

    return {
      ...stage,
      description: stageDescriptionMap[stage.key],
      items: stageItems,
      riskCount: stageItems.filter(
        (submission) => submission.riskFlag !== "none",
      ).length,
    };
  });

const ViewToggleLink = ({
  active,
  children,
  href,
  icon,
}: {
  active: boolean;
  children: ReactNode;
  href: string;
  icon: ReactNode;
}) => (
  <TrackedLink
    aria-current={active ? "page" : undefined}
    href={href}
    className={cn(
      "inline-flex h-10 items-center justify-center gap-2 rounded-full border px-4 text-sm font-semibold transition-colors",
      active
        ? "border-foreground/15 bg-foreground text-background shadow-[0_18px_42px_-32px_var(--shadow-color)]"
        : "border-border/70 bg-background/70 text-muted-foreground hover:bg-surface-2 hover:text-foreground",
    )}
  >
    {icon}
    {children}
  </TrackedLink>
);

const PipelineBadge = ({
  children,
  className,
}: {
  children: ReactNode;
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

const PipelineMetricTile = ({ detail, label, tone, value }: PipelineMetric) => (
  <div className="min-w-0 rounded-[1.05rem] border border-border/70 bg-workspace-muted-surface/62 px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]">
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-[0.66rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          {label}
        </p>
        <p className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-foreground">
          {value}
        </p>
      </div>
      <span className={cn("mt-1 size-2.5 rounded-full", tone)} />
    </div>
    <p className="mt-3 text-xs leading-5 text-muted-foreground">{detail}</p>
  </div>
);

const PipelineStageRail = ({
  groups,
  totalItems,
}: {
  groups: PipelineStageGroup[];
  totalItems: number;
}) => (
  <div className="overflow-x-auto pb-1">
    <div className="grid min-w-[68rem] grid-cols-7 gap-2">
      {groups.map((stage, index) => {
        const share =
          totalItems > 0
            ? Math.round((stage.items.length / totalItems) * 100)
            : 0;
        const width = stage.items.length > 0 ? Math.max(12, share) : 0;

        return (
          <div
            key={stage.key}
            className={cn(
              "relative overflow-hidden rounded-[1.15rem] border bg-background/58 px-3 py-3",
              stageBorderClassMap[stage.key],
            )}
          >
            <div
              className={cn(
                "absolute inset-x-0 top-0 h-1",
                stageAccentClassMap[stage.key],
              )}
            />
            <div className="flex items-center justify-between gap-3">
              <span className="text-[0.64rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                {String(index + 1).padStart(2, "0")}
              </span>
              {index < groups.length - 1 ? (
                <ArrowRight className="size-3.5 text-muted-foreground/70" />
              ) : null}
            </div>
            <div className="mt-4 flex items-end justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">
                  {stage.label}
                </p>
                <p className="mt-1 truncate text-xs text-muted-foreground">
                  {stage.description}
                </p>
              </div>
              <span className="text-2xl font-semibold tracking-[-0.05em] text-foreground">
                {stage.items.length}
              </span>
            </div>
            <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-surface-2/80">
              <span
                className={cn(
                  "block h-full rounded-full",
                  stageAccentClassMap[stage.key],
                )}
                style={{ width: `${width}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {stage.riskCount > 0
                ? `${stage.riskCount} needs attention`
                : "No risk flags"}
            </p>
          </div>
        );
      })}
    </div>
  </div>
);

const PipelineFocusPanel = ({
  atRiskItems,
  pressureStage,
}: {
  atRiskItems: SubmissionRecord[];
  pressureStage: PipelineStageGroup;
}) => {
  const leadRisk = atRiskItems[0] ?? null;

  return (
    <aside className="rounded-[1.2rem] border border-border/70 bg-background/62 p-4">
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-[1rem] border border-border/70 bg-workspace-muted-surface/70">
          <Gauge className="size-4 text-foreground" />
        </span>
        <div className="min-w-0">
          <p className="text-[0.66rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Flow pressure
          </p>
          <p className="mt-1 text-lg font-semibold tracking-[-0.04em] text-foreground">
            {pressureStage.items.length > 0
              ? `${pressureStage.label} is busiest`
              : "No active pressure"}
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-3">
        <div className="rounded-[1rem] border border-border/70 bg-workspace-muted-surface/55 px-3 py-3">
          <p className="text-xs font-semibold text-muted-foreground">
            Current lane load
          </p>
          <div className="mt-2 flex items-center justify-between gap-3">
            <span className="text-sm font-medium text-foreground">
              {pressureStage.description}
            </span>
            <span className="text-xl font-semibold tracking-[-0.04em] text-foreground">
              {pressureStage.items.length}
            </span>
          </div>
        </div>

        <div className="rounded-[1rem] border border-border/70 bg-workspace-muted-surface/55 px-3 py-3">
          <p className="text-xs font-semibold text-muted-foreground">
            Attention signal
          </p>
          {leadRisk ? (
            <div className="mt-2 min-w-0">
              <p className="truncate text-sm font-medium text-foreground">
                {getCandidateTitle(leadRisk)}
              </p>
              <p className="mt-1 truncate text-xs text-muted-foreground">
                {getRoleTitle(leadRisk)}
              </p>
            </div>
          ) : (
            <p className="mt-2 text-sm text-foreground">Risk queue is clear</p>
          )}
        </div>
      </div>
    </aside>
  );
};

const StagePill = ({ stage }: { stage: ApiSubmissionStage }) => (
  <PipelineBadge className="border-border/70 bg-surface-1 text-muted-foreground">
    <span
      className={cn("mr-1.5 size-2 rounded-full", stageAccentClassMap[stage])}
    />
    {stageLabelMap[stage]}
  </PipelineBadge>
);

const PipelineListView = ({
  canChangeStage,
  items,
  onOpenSubmission,
  selectedSubmissionId,
}: {
  canChangeStage: boolean;
  items: SubmissionRecord[];
  onOpenSubmission: (submissionId: string) => void;
  selectedSubmissionId: string | null;
}) => (
  <div className="overflow-hidden rounded-[1.25rem] border border-border/70 bg-background/48">
    <div className="hidden grid-cols-[minmax(0,1fr)_minmax(13rem,0.75fr)_10rem_minmax(12rem,0.7fr)_minmax(14rem,0.9fr)] gap-4 bg-workspace-muted-surface/62 px-4 py-3 text-[0.66rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground lg:grid">
      <span>Candidate</span>
      <span>Role</span>
      <span>Stage</span>
      <span>Owner</span>
      <span>Next step</span>
    </div>

    <div className="divide-y divide-border/60">
      {items.map((submission) => (
        <article
          key={submission.id}
          className={cn(
            "relative grid gap-4 px-4 py-4 transition-colors lg:grid-cols-[minmax(0,1fr)_minmax(13rem,0.75fr)_10rem_minmax(12rem,0.7fr)_minmax(14rem,0.9fr)] lg:items-center",
            selectedSubmissionId === submission.id
              ? "bg-primary/8"
              : "hover:bg-workspace-muted-surface/36",
          )}
        >
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">
              {getCandidateTitle(submission)}
            </p>
            <p className="mt-1 truncate text-xs text-muted-foreground">
              {getCandidateSubtitle(submission)}
            </p>
          </div>

          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">
              {getRoleTitle(submission)}
            </p>
            <p className="mt-1 truncate text-xs text-muted-foreground">
              {getClientName(submission)}
            </p>
          </div>

          <StagePill stage={submission.stage} />

          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">
              {getOwnerLabel(submission)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {formatDate(getTouchValue(submission))}
            </p>
          </div>

          <div className="min-w-0">
            <PipelineRiskControl
              canUpdate={canChangeStage}
              riskFlag={submission.riskFlag}
              submissionId={submission.id}
            />
            <PipelineNextStepControl
              canUpdate={canChangeStage}
              className="mt-2"
              compact
              nextStep={submission.nextStep}
              submissionId={submission.id}
            />
            <Button
              className="mt-2 rounded-full"
              size="sm"
              type="button"
              variant="outline"
              onClick={() => {
                onOpenSubmission(submission.id);
              }}
            >
              <PanelRightOpen className="size-3.5" />
              Details
            </Button>
          </div>
        </article>
      ))}
    </div>
  </div>
);

const PipelineEmptyState = ({
  hasFilters,
  resetHref,
}: {
  hasFilters: boolean;
  resetHref: string;
}) => (
  <div className="rounded-[1.4rem] border border-dashed border-border/75 bg-workspace-muted-surface/42 px-6 py-14 text-center">
    <span className="mx-auto flex size-14 items-center justify-center rounded-[1.2rem] border border-border/70 bg-background/72">
      {hasFilters ? (
        <RotateCcw className="size-5 text-foreground" />
      ) : (
        <KanbanSquare className="size-5 text-foreground" />
      )}
    </span>
    <h2 className="mt-5 text-xl font-semibold tracking-[-0.04em] text-foreground">
      {hasFilters ? "No matching opportunities" : "No opportunities in flight"}
    </h2>
    <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
      {hasFilters
        ? "The current filter set has no visible opportunities. Reset the view or launch a new candidate-role opportunity."
        : "Launch the first candidate-role opportunity, then this route becomes the operating surface for stages, risk, owners, and next steps."}
    </p>
    <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
      <Button asChild className="rounded-full">
        <TrackedLink href="/pipeline/new">
          <Plus className="size-4" />
          Launch opportunity
        </TrackedLink>
      </Button>
      {hasFilters ? (
        <Button asChild variant="outline" className="rounded-full">
          <TrackedLink href={resetHref}>
            <RotateCcw className="size-4" />
            Reset view
          </TrackedLink>
        </Button>
      ) : null}
    </div>
  </div>
);

const PipelineFilterStrip = ({
  activeFilters,
  resetHref,
}: {
  activeFilters: PipelineActiveFilter[];
  resetHref: string;
}) => (
  <div className="flex flex-wrap items-center gap-2">
    {activeFilters.length > 0 ? (
      <>
        {activeFilters.map((filter) => (
          <PipelineBadge
            key={`${filter.label}-${filter.value}`}
            className="border-border/70 bg-surface-1 text-muted-foreground"
          >
            {filter.label}: {filter.value}
          </PipelineBadge>
        ))}
        <Button asChild size="sm" variant="ghost" className="rounded-full">
          <TrackedLink href={resetHref}>
            <RotateCcw className="size-3.5" />
            Reset
          </TrackedLink>
        </Button>
      </>
    ) : (
      <PipelineBadge className="border-border/70 bg-surface-1 text-muted-foreground">
        Full pipeline
      </PipelineBadge>
    )}
  </div>
);

export const PipelineSurface = ({
  activeFilters,
  boardHref,
  clientFilterOptionItems,
  filterValues,
  jobFilterOptionItems,
  listHref,
  resetHref,
  submissions,
  submissionCreated,
  view,
}: PipelineSurfaceProps) => {
  const items = submissions.items;
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<
    string | null
  >(null);
  const selectedSubmission =
    items.find((submission) => submission.id === selectedSubmissionId) ?? null;
  const stageGroups = buildStageGroups(items);
  const openStageGroups = stageGroups.filter((stage) => !stage.isClosedStage);
  const activeItems = items.filter(
    (submission) => !terminalStages.has(submission.stage),
  );
  const atRiskItems = items.filter(
    (submission) => submission.riskFlag !== "none",
  );
  const clientFacingItems = items.filter((submission) =>
    clientFacingStages.has(submission.stage),
  );
  const outcomeItems = items.filter((submission) =>
    terminalStages.has(submission.stage),
  );
  const pressureStage =
    openStageGroups
      .slice()
      .sort((left, right) => right.items.length - left.items.length)[0] ??
    stageGroups[0];
  const hasFilters = activeFilters.length > 0;
  const canChangeStage = submissions.context.role !== "coordinator";
  const canLaunch = canChangeStage;
  const metrics: PipelineMetric[] = [
    {
      detail: "Open opportunities before placed or lost.",
      label: "Active",
      tone: "bg-emerald-500",
      value: activeItems.length,
    },
    {
      detail: "Risk markers visible in this view.",
      label: "Attention",
      tone: "bg-amber-500",
      value: atRiskItems.length,
    },
    {
      detail: "Submitted, interview, and offer lanes.",
      label: "Client-facing",
      tone: "bg-sky-500",
      value: clientFacingItems.length,
    },
    {
      detail: "Placed and lost outcomes in scope.",
      label: "Outcomes",
      tone: "bg-violet-500",
      value: outcomeItems.length,
    },
  ];

  return (
    <section className="space-y-6 px-0 py-1 lg:py-2">
      <WorkspacePageHeader
        kicker="Opportunity pipeline"
        title="Pipeline"
        description="A stage-first operating view for candidate-role opportunities, owner attention, and client-facing momentum."
        rightSlotClassName="w-full xl:w-[24rem]"
        rightSlot={
          <div className="flex w-full flex-col gap-3">
            <div className="grid gap-2 sm:grid-cols-2">
              {canLaunch ? (
                <Button asChild className="w-full justify-center rounded-full">
                  <TrackedLink href="/pipeline/new">
                    <Plus className="size-4" />
                    Launch opportunity
                  </TrackedLink>
                </Button>
              ) : (
                <Button className="w-full justify-center rounded-full" disabled>
                  <Plus className="size-4" />
                  Launch restricted
                </Button>
              )}
              <PipelineExportButton
                filters={filterValues}
                totalItems={submissions.pagination.totalItems}
                view={view}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <ViewToggleLink
                active={view === "board"}
                href={boardHref}
                icon={<KanbanSquare className="size-4" />}
              >
                Board
              </ViewToggleLink>
              <ViewToggleLink
                active={view === "list"}
                href={listHref}
                icon={<ListChecks className="size-4" />}
              >
                List
              </ViewToggleLink>
            </div>
          </div>
        }
      />

      {submissionCreated ? (
        <div className="flex items-start gap-3 rounded-[1.15rem] border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-emerald-700 dark:text-emerald-300">
          <ShieldCheck className="mt-0.5 size-4 shrink-0" />
          <div>
            <p className="text-sm font-semibold">Opportunity launched</p>
            <p className="mt-1 text-sm leading-6">
              The candidate is now active for this role and visible in the
              workspace-scoped pipeline.
            </p>
          </div>
        </div>
      ) : null}

      <PipelineFilterControls
        activeFilters={activeFilters}
        clientFilterOptionItems={clientFilterOptionItems}
        filters={filterValues}
        jobFilterOptionItems={jobFilterOptionItems}
        resetHref={resetHref}
        submissions={submissions}
      />

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <PipelineMetricTile key={metric.label} {...metric} />
        ))}
      </div>

      <div className="rounded-[1.65rem] border border-border/70 bg-background/45 p-3 shadow-[0_24px_70px_-54px_var(--shadow-color)]">
        <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="rounded-[1.25rem] border border-border/70 bg-workspace-muted-surface/48 p-4">
            <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-[0.66rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Stage flow
                </p>
                <p className="mt-1 text-sm text-foreground">
                  {items.length} visible opportunities across the standard
                  recruiting path.
                </p>
              </div>
              <PipelineFilterStrip
                activeFilters={activeFilters}
                resetHref={resetHref}
              />
            </div>
            <PipelineStageRail groups={stageGroups} totalItems={items.length} />
          </div>

          <PipelineFocusPanel
            atRiskItems={atRiskItems}
            pressureStage={pressureStage}
          />
        </div>
      </div>

      <div className="rounded-[1.65rem] border border-border/70 bg-background/45 p-3 shadow-[0_24px_70px_-54px_var(--shadow-color)]">
        <div className="flex flex-col gap-3 rounded-[1.2rem] border border-border/70 bg-workspace-muted-surface/48 px-4 py-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-[0.66rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              {view === "board" ? "Board view" : "List view"}
            </p>
            <p className="mt-1 text-sm text-foreground">
              {view === "board"
                ? "Stage columns expose where the recruiting work is collecting."
                : "Dense rows keep owner review and follow-up scanning fast."}
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="size-3.5" />
            <span>
              {canChangeStage
                ? "Stage changes update the API"
                : "Coordinators inspect only"}
            </span>
          </div>
        </div>

        <div className="mt-3">
          {items.length > 0 ? (
            view === "board" ? (
              <PipelineBoardView
                canChangeStage={canChangeStage}
                groups={stageGroups}
                onOpenSubmission={setSelectedSubmissionId}
                selectedSubmissionId={selectedSubmissionId}
              />
            ) : (
              <PipelineListView
                canChangeStage={canChangeStage}
                items={items}
                onOpenSubmission={setSelectedSubmissionId}
                selectedSubmissionId={selectedSubmissionId}
              />
            )
          ) : (
            <PipelineEmptyState hasFilters={hasFilters} resetHref={resetHref} />
          )}
        </div>
      </div>

      <PipelineSubmissionDetailPanel
        canChangeStage={canChangeStage}
        open={Boolean(selectedSubmissionId)}
        ownerOptions={submissions.ownerOptions}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedSubmissionId(null);
          }
        }}
        submission={selectedSubmission}
      />
    </section>
  );
};
