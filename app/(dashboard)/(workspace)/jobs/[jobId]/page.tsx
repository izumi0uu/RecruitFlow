import type {
  ApiRiskFlag,
  ApiSubmissionStage,
  JobDetailResponse,
  JobRecord,
  JobStageTemplateSummary,
  SubmissionRecord,
  SubmissionsListResponse,
} from "@recruitflow/contracts";
import { apiDefaultJobStageTemplate } from "@recruitflow/contracts";
import {
  BriefcaseBusiness,
  Building2,
  CalendarClock,
  ClipboardList,
  DollarSign,
  FileText,
  Gauge,
  Layers3,
  MapPin,
  Pencil,
  Send,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { notFound, redirect } from "next/navigation";

import { TrackedLink } from "@/components/navigation/TrackedLink";
import { Button } from "@/components/ui/Button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { WorkspacePageHeader } from "@/components/workspace/WorkspacePageHeader";
import { isApiRequestError, requestApiJson } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import { QuickTaskPanel } from "../../tasks/components/QuickTaskPanel";

import { JobStatusPriorityControls as JobStatusPriorityControlsForm } from "../components/JobStatusPriorityControls";
import {
  formatJobDetailDate,
  formatJobLabel,
  formatJobPlacementFee,
  formatJobSalaryRange,
  jobDetailPriorityToneMap,
  jobStatusToneMap,
} from "../utils";

type PageProps = {
  params: Promise<{
    jobId: string;
  }>;
  searchParams?:
    | Promise<Record<string, string | string[] | undefined>>
    | Record<string, string | string[] | undefined>;
};

const hasRestrictedFlag = (
  params: Record<string, string | string[] | undefined>,
) => {
  const restricted = params.restricted;

  return Array.isArray(restricted) ? restricted[0] === "1" : restricted === "1";
};

const hasSubmissionCreatedFlag = (
  params: Record<string, string | string[] | undefined>,
) => {
  const submissionCreated = params.submissionCreated;

  return Array.isArray(submissionCreated)
    ? submissionCreated[0] === "1"
    : submissionCreated === "1";
};

const getJobDetail = async (jobId: string) => {
  try {
    return await requestApiJson<JobDetailResponse>(`/jobs/${jobId}`);
  } catch (error) {
    if (isApiRequestError(error)) {
      if (error.status === 401) {
        redirect("/sign-in");
      }

      if (error.status === 400 || error.status === 404) {
        notFound();
      }
    }

    throw error;
  }
};

const getJobSubmissions = async (jobId: string) => {
  try {
    return await requestApiJson<SubmissionsListResponse>(
      `/submissions?jobId=${jobId}&pageSize=100`,
    );
  } catch (error) {
    if (isApiRequestError(error) && error.status === 401) {
      redirect("/sign-in");
    }

    throw error;
  }
};

const Badge = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <span
    className={cn(
      "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold",
      className,
    )}
  >
    {children}
  </span>
);

const DetailTile = ({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) => (
  <div className="rounded-[1.35rem] border border-border/70 bg-surface-1/70 p-4">
    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
      {icon}
      {label}
    </div>
    <p className="mt-3 text-sm font-medium leading-6 text-foreground">
      {value}
    </p>
  </div>
);

const JobStatusPriorityControls = ({ job }: { job: JobRecord }) => (
  <Card>
    <CardHeader>
      <CardTitle>Operating controls</CardTitle>
      <CardDescription>
        Update the job state without opening the full intake form. Status
        changes still write API-owned audit events.
      </CardDescription>
    </CardHeader>
    <CardContent>
      <JobStatusPriorityControlsForm job={job} />
    </CardContent>
  </Card>
);

const stageLabelMap = Object.fromEntries(
  apiDefaultJobStageTemplate.map((stage) => [stage.key, stage.label]),
) as Record<ApiSubmissionStage, string>;

const stageAccentClassMap: Record<ApiSubmissionStage, string> = {
  client_interview: "bg-sky-500",
  lost: "bg-slate-400",
  offer: "bg-violet-500",
  placed: "bg-emerald-500",
  screening: "bg-amber-500",
  sourced: "bg-zinc-500",
  submitted: "bg-cyan-500",
};

const stageBadgeClassMap: Record<ApiSubmissionStage, string> = {
  client_interview:
    "border-sky-500/25 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  lost: "border-slate-400/25 bg-slate-400/10 text-slate-700 dark:text-slate-300",
  offer:
    "border-violet-500/25 bg-violet-500/10 text-violet-700 dark:text-violet-300",
  placed:
    "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  screening:
    "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  sourced: "border-border/70 bg-surface-1 text-muted-foreground",
  submitted:
    "border-cyan-500/25 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300",
};

const riskLabelMap: Record<ApiRiskFlag, string> = {
  compensation_risk: "Compensation",
  feedback_risk: "Feedback",
  fit_risk: "Fit",
  none: "Clear",
  timing_risk: "Timing",
};

const riskBadgeClassMap: Record<ApiRiskFlag, string> = {
  compensation_risk:
    "border-rose-500/25 bg-rose-500/10 text-rose-700 dark:text-rose-300",
  feedback_risk:
    "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  fit_risk:
    "border-violet-500/25 bg-violet-500/10 text-violet-700 dark:text-violet-300",
  none: "border-border/70 bg-surface-1 text-muted-foreground",
  timing_risk:
    "border-orange-500/25 bg-orange-500/10 text-orange-700 dark:text-orange-300",
};

const clientFacingStages = new Set<ApiSubmissionStage>([
  "submitted",
  "client_interview",
  "offer",
]);

const terminalStages = new Set<ApiSubmissionStage>(["lost", "placed"]);

const getSubmissionTouchValue = (submission: SubmissionRecord) =>
  submission.lastTouchAt ?? submission.updatedAt ?? submission.createdAt;

const getSubmissionOwnerLabel = (submission: SubmissionRecord) =>
  submission.owner?.name ?? submission.owner?.email ?? "Unassigned";

const getSubmissionCandidateLabel = (submission: SubmissionRecord) =>
  submission.candidate?.fullName ?? "Unknown candidate";

const getSubmissionCandidateContext = (submission: SubmissionRecord) =>
  [submission.candidate?.currentTitle, submission.candidate?.currentCompany]
    .filter(Boolean)
    .join(" at ") ||
  submission.candidate?.headline ||
  submission.candidate?.source ||
  "Candidate context pending";

const PipelineSummaryMetric = ({
  label,
  value,
}: {
  label: string;
  value: number;
}) => (
  <div className="rounded-[1.05rem] border border-border/70 bg-workspace-muted-surface/54 px-3 py-3">
    <p className="text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
      {label}
    </p>
    <p className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-foreground">
      {value}
    </p>
  </div>
);

const RolePipelineStageRail = ({
  submissions,
}: {
  submissions: SubmissionRecord[];
}) => {
  const total = submissions.length;

  return (
    <div className="grid gap-2 md:grid-cols-7">
      {apiDefaultJobStageTemplate.map((stage) => {
        const stageCount = submissions.filter(
          (submission) => submission.stage === stage.key,
        ).length;
        const width =
          total > 0 ? Math.max(10, Math.round((stageCount / total) * 100)) : 0;

        return (
          <div
            key={stage.key}
            className="overflow-hidden rounded-[1rem] border border-border/70 bg-surface-1/65 px-3 py-3"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="truncate text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                {stage.label}
              </span>
              <span className="text-xs font-semibold text-foreground">
                {stageCount}
              </span>
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-background/70">
              <span
                className={cn(
                  "block h-full rounded-full",
                  stageAccentClassMap[stage.key],
                )}
                style={{ width: `${width}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};

const RolePipelineRow = ({
  jobId,
  submission,
}: {
  jobId: string;
  submission: SubmissionRecord;
}) => (
  <div className="grid gap-3 rounded-[1.15rem] border border-border/70 bg-surface-1/60 p-4 lg:grid-cols-[minmax(0,1fr)_minmax(10rem,0.45fr)_auto] lg:items-center">
    <div className="min-w-0">
      <div className="flex flex-wrap items-center gap-2">
        <Badge className={stageBadgeClassMap[submission.stage]}>
          {stageLabelMap[submission.stage]}
        </Badge>
        <Badge className={riskBadgeClassMap[submission.riskFlag]}>
          {riskLabelMap[submission.riskFlag]}
        </Badge>
      </div>
      <p className="mt-3 truncate text-sm font-semibold text-foreground">
        {getSubmissionCandidateLabel(submission)}
      </p>
      <p className="mt-1 truncate text-sm leading-6 text-muted-foreground">
        {getSubmissionCandidateContext(submission)}
      </p>
    </div>

    <div className="min-w-0 text-sm leading-6 text-muted-foreground">
      <p className="truncate">Owner: {getSubmissionOwnerLabel(submission)}</p>
      <p className="truncate">
        Touch: {formatJobDetailDate(getSubmissionTouchValue(submission))}
      </p>
      <p className="truncate">
        Next: {submission.nextStep ?? "No next step captured"}
      </p>
    </div>

    <Button asChild className="rounded-full" variant="outline">
      <TrackedLink href={`/pipeline?jobId=${jobId}&view=list`}>
        Open pipeline
      </TrackedLink>
    </Button>
  </div>
);

const RolePipelineSummary = ({
  canCreate,
  job,
  submissions,
}: {
  canCreate: boolean;
  job: JobRecord;
  submissions: SubmissionsListResponse;
}) => {
  const items = submissions.items;
  const activeCount = items.filter(
    (submission) => !terminalStages.has(submission.stage),
  ).length;
  const riskCount = items.filter(
    (submission) => submission.riskFlag !== "none",
  ).length;
  const clientFacingCount = items.filter((submission) =>
    clientFacingStages.has(submission.stage),
  ).length;
  const recentItems = items.slice(0, 4);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Gauge className="size-4" />
              Role pipeline
            </CardTitle>
            <CardDescription>
              A lightweight submission cockpit for this job before tasks, notes,
              and activity aggregation land.
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild className="rounded-full" variant="outline">
              <TrackedLink href={`/pipeline?jobId=${job.id}`}>
                View pipeline
              </TrackedLink>
            </Button>
            {canCreate ? (
              <Button asChild className="rounded-full">
                <TrackedLink
                  href={`/pipeline/new?jobId=${job.id}&returnTo=job`}
                >
                  <Send className="size-4" />
                  Launch candidate
                </TrackedLink>
              </Button>
            ) : null}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <PipelineSummaryMetric
            label="Total tracks"
            value={submissions.pagination.totalItems}
          />
          <PipelineSummaryMetric label="Active" value={activeCount} />
          <PipelineSummaryMetric label="Attention" value={riskCount} />
          <PipelineSummaryMetric
            label="Client-facing"
            value={clientFacingCount}
          />
        </div>

        <RolePipelineStageRail submissions={items} />

        {recentItems.length > 0 ? (
          <div className="space-y-3">
            {recentItems.map((submission) => (
              <RolePipelineRow
                key={submission.id}
                jobId={job.id}
                submission={submission}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-[1.35rem] border border-dashed border-border bg-surface-1/60 p-5">
            <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <ShieldCheck className="size-4 text-muted-foreground" />
              No candidates are moving on this role yet.
            </p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Launch the first candidate-role track when the intake, owner, and
              stage template are ready.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const TextPanel = ({
  description,
  fallback,
  title,
  value,
}: {
  description: string;
  fallback: string;
  title: string;
  value: string | null;
}) => (
  <Card>
    <CardHeader>
      <CardTitle>{title}</CardTitle>
      <CardDescription>{description}</CardDescription>
    </CardHeader>
    <CardContent>
      <p className="whitespace-pre-wrap rounded-[1.35rem] border border-border/70 bg-surface-1/70 p-4 text-sm leading-6 text-foreground">
        {value ?? fallback}
      </p>
    </CardContent>
  </Card>
);

const StageTemplateOverview = ({
  stageTemplate,
}: {
  stageTemplate: JobStageTemplateSummary;
}) => {
  const labelsByKey = new Map(
    stageTemplate.expectedStages.map((stage) => [stage.key, stage.label]),
  );
  const missingLabels = stageTemplate.missingStageKeys.map(
    (key) => labelsByKey.get(key) ?? key,
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Layers3 className="size-4" />
          Stage template preview
        </CardTitle>
        <CardDescription>
          The job-owned stage container RF-24 initialized for downstream
          submission work.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {stageTemplate.expectedStages.map((stage) => {
            const isPresent = stageTemplate.stages.some(
              (existingStage) => existingStage.key === stage.key,
            );

            return (
              <div
                key={stage.key}
                className={cn(
                  "rounded-[1.1rem] border px-3 py-3",
                  isPresent
                    ? "border-border/70 bg-surface-1/70"
                    : "border-amber-300/70 bg-amber-50 text-amber-950",
                )}
              >
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Stage {stage.sortOrder}
                </p>
                <p className="mt-2 text-sm font-semibold">{stage.label}</p>
              </div>
            );
          })}
        </div>

        {stageTemplate.status === "complete" ? (
          <p className="text-sm leading-6 text-muted-foreground">
            Stage template is complete. The submission branch can attach
            candidate movement to this predictable sequence.
          </p>
        ) : (
          <p className="rounded-[1.2rem] border border-amber-300/70 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
            Missing stages: {missingLabels.join(", ")}. Use the edit screen to
            repair the default template before pipeline work depends on it.
          </p>
        )}
      </CardContent>
    </Card>
  );
};

const JobDetailPage = async ({ params, searchParams }: PageProps) => {
  const { jobId } = await params;
  const urlParams = await Promise.resolve(searchParams ?? {});
  const [{ context, job, ownerOptions, stageTemplate }, jobSubmissions] =
    await Promise.all([getJobDetail(jobId), getJobSubmissions(jobId)]);
  const ownerLabel = job.owner?.name ?? job.owner?.email ?? "Unassigned";
  const canEdit = context.role !== "coordinator";

  return (
    <section className="space-y-6 px-0 py-1 lg:py-2">
      <WorkspacePageHeader
        backHref="/jobs"
        breadcrumbItems={[
          { label: "Jobs", href: "/jobs" },
          { label: job.title },
        ]}
        kicker="Job overview"
        title={job.title}
        description="The upstream role detail page for intake context, default stages, and future submission handoff."
        rightSlot={
          canEdit ? (
            <Button asChild className="rounded-full" variant="outline">
              <TrackedLink href={`/jobs/${job.id}/edit`}>
                <Pencil className="size-4" />
                Edit job
              </TrackedLink>
            </Button>
          ) : (
            <span className="status-message border-border/70 bg-surface-1/70 text-muted-foreground">
              Coordinator read-only view
            </span>
          )
        }
      />

      {hasRestrictedFlag(urlParams) ? (
        <p className="status-message status-error">
          Only owners and recruiters can update job status or priority.
        </p>
      ) : null}

      {hasSubmissionCreatedFlag(urlParams) ? (
        <p className="status-message status-success">
          Opportunity launched and linked to this job.
        </p>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-5">
          <Card className="overflow-hidden">
            <CardHeader>
              <div className="flex flex-wrap items-center gap-2">
                <Badge className={jobStatusToneMap[job.status]}>
                  {formatJobLabel(job.status)}
                </Badge>
                <Badge className={jobDetailPriorityToneMap[job.priority]}>
                  {formatJobLabel(job.priority)} priority
                </Badge>
              </div>
              <CardTitle className="text-2xl">Role baseline</CardTitle>
              <CardDescription>
                Structured requisition facts that downstream submissions, tasks,
                and dashboard metrics can reuse.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <DetailTile
                icon={<Building2 className="size-3.5" />}
                label="Client"
                value={job.client?.name ?? "Missing client"}
              />
              <DetailTile
                icon={<UserRound className="size-3.5" />}
                label="Owner"
                value={ownerLabel}
              />
              <DetailTile
                icon={<BriefcaseBusiness className="size-3.5" />}
                label="Department"
                value={job.department ?? "No department captured yet"}
              />
              <DetailTile
                icon={<MapPin className="size-3.5" />}
                label="Location"
                value={job.location ?? "No location captured yet"}
              />
              <DetailTile
                icon={<ClipboardList className="size-3.5" />}
                label="Employment"
                value={job.employmentType ?? "No employment type captured yet"}
              />
              <DetailTile
                icon={<CalendarClock className="size-3.5" />}
                label="Target fill"
                value={formatJobDetailDate(job.targetFillDate)}
              />
            </CardContent>
          </Card>

          <RolePipelineSummary
            canCreate={canEdit}
            job={job}
            submissions={jobSubmissions}
          />

          <TextPanel
            title="Intake summary"
            description="The concise hiring context recruiters need before matching candidates."
            fallback="No intake summary yet. Add the hiring context, must-have signals, and urgency in the edit form."
            value={job.intakeSummary}
          />

          <TextPanel
            title="Role description"
            description="Working JD or internal role notes. AI summary work remains downstream."
            fallback="No role description yet. Paste the working JD or internal notes in the edit form."
            value={job.description}
          />

          <StageTemplateOverview stageTemplate={stageTemplate} />
        </div>

        <aside className="space-y-5">
          {canEdit ? (
            <JobStatusPriorityControls job={job} />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Operating controls</CardTitle>
                <CardDescription>
                  Coordinators can inspect job urgency, but only owners and
                  recruiters can change restricted state.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-[1.35rem] border border-border/70 bg-surface-1/70 p-4">
                  <p className="text-sm font-medium text-foreground">
                    Read-only controls
                  </p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    The API also enforces this restriction, so hidden UI cannot
                    become a permission bypass.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          <QuickTaskPanel
            canCreateTask={!job.archivedAt}
            defaultAssignedToUserId={job.ownerUserId}
            entity={{
              entityId: job.id,
              entityType: "job",
              label: job.title,
              secondaryLabel: job.client?.name ?? null,
              trail: ["Job", job.client?.name, job.title].filter(
                (item): item is string => Boolean(item),
              ),
            }}
            ownerOptions={ownerOptions}
            title="Job tasks"
          />

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="size-4" />
                Compensation
              </CardTitle>
              <CardDescription>
                Financial context for priority, fee, and dashboard surfaces.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <DetailTile
                icon={<DollarSign className="size-3.5" />}
                label="Salary range"
                value={formatJobSalaryRange(job)}
              />
              <DetailTile
                icon={<BriefcaseBusiness className="size-3.5" />}
                label="Headcount"
                value={
                  job.headcount == null ? "Not set" : String(job.headcount)
                }
              />
              <DetailTile
                icon={<ClipboardList className="size-3.5" />}
                label="Placement fee"
                value={formatJobPlacementFee(job.placementFeePercent)}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarClock className="size-4" />
                Timeline
              </CardTitle>
              <CardDescription>
                Lightweight date context before activity aggregation lands.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <DetailTile
                icon={<CalendarClock className="size-3.5" />}
                label="Opened"
                value={formatJobDetailDate(job.openedAt)}
              />
              <DetailTile
                icon={<CalendarClock className="size-3.5" />}
                label="Updated"
                value={formatJobDetailDate(job.updatedAt)}
              />
              <DetailTile
                icon={<CalendarClock className="size-3.5" />}
                label="Created"
                value={formatJobDetailDate(job.createdAt)}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="size-4" />
                Opportunity launch
              </CardTitle>
              <CardDescription>
                Start a candidate-role track from this job context.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-[1.35rem] border border-dashed border-border bg-surface-1/60 p-5">
                <p className="text-sm font-medium text-foreground">
                  Launch from role context.
                </p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  This detail page confirms the job, owner, client, and stage
                  template are ready before a candidate is moved into the
                  pipeline.
                </p>
              </div>
              {canEdit ? (
                <Button asChild className="mt-4 w-full rounded-full">
                  <TrackedLink
                    href={`/pipeline/new?jobId=${job.id}&returnTo=job`}
                  >
                    <Send className="size-4" />
                    Launch candidate
                  </TrackedLink>
                </Button>
              ) : null}
            </CardContent>
          </Card>
        </aside>
      </div>
    </section>
  );
};

export default JobDetailPage;
