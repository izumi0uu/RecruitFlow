import {
  ArrowLeft,
  BriefcaseBusiness,
  Building2,
  CalendarClock,
  ClipboardList,
  DollarSign,
  FileText,
  Layers3,
  MapPin,
  Pencil,
  Send,
  UserRound,
} from "lucide-react";
import { notFound, redirect } from "next/navigation";

import type {
  JobDetailResponse,
  JobRecord,
  JobStageTemplateSummary,
} from "@recruitflow/contracts";

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

  return Array.isArray(restricted)
    ? restricted[0] === "1"
    : restricted === "1";
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
  const { context, job, stageTemplate } = await getJobDetail(jobId);
  const ownerLabel = job.owner?.name ?? job.owner?.email ?? "Unassigned";
  const canEdit = context.role !== "coordinator";

  return (
    <section className="space-y-6 px-0 py-1 lg:py-2">
      <div className="flex flex-wrap items-center gap-3">
        <Button asChild variant="ghost" className="rounded-full">
          <TrackedLink href="/jobs">
            <ArrowLeft className="size-4" />
            Back to jobs
          </TrackedLink>
        </Button>
      </div>

      <WorkspacePageHeader
        kicker="Job overview"
        title={job.title}
        description="The upstream role detail page for intake context, default stages, and future submission handoff."
        rightSlot={
          canEdit ? (
            <Button asChild className="rounded-full">
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
                Structured requisition facts that downstream submissions,
                tasks, and dashboard metrics can reuse.
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
                value={job.headcount == null ? "Not set" : String(job.headcount)}
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
                  <TrackedLink href={`/pipeline/new?jobId=${job.id}&returnTo=job`}>
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
