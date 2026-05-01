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
  UserRound,
} from "lucide-react";
import { notFound, redirect } from "next/navigation";

import type {
  ApiJobPriority,
  ApiJobStatus,
  JobDetailResponse,
  JobRecord,
  JobStageTemplateSummary,
} from "@recruitflow/contracts";
import {
  apiJobPriorityValues,
  apiJobStatusValues,
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

import { updateJobControlsAction } from "../actions";

type PageProps = {
  params: Promise<{
    jobId: string;
  }>;
};

const statusToneMap: Record<ApiJobStatus, string> = {
  closed: "border-border/70 bg-surface-1 text-muted-foreground",
  filled: "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  intake: "border-sky-500/25 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  on_hold: "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  open: "border-lime-500/25 bg-lime-500/10 text-lime-700 dark:text-lime-300",
};

const priorityToneMap: Record<ApiJobPriority, string> = {
  high: "bg-rose-500/10 text-rose-700 dark:text-rose-300",
  low: "bg-surface-1 text-muted-foreground",
  medium: "bg-muted text-foreground",
  urgent: "bg-foreground text-background",
};

const toTitleCase = (value: string) =>
  value
    .split("_")
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(" ");

const formatDate = (value: string | null) => {
  if (!value) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
};

const getCurrencyCode = (value: string | null) => {
  const currency = value?.trim().toUpperCase() || "USD";

  return /^[A-Z]{3}$/.test(currency) ? currency : "USD";
};

const formatMoney = (value: number, currency: string | null) =>
  new Intl.NumberFormat("en", {
    currency: getCurrencyCode(currency),
    maximumFractionDigits: 0,
    style: "currency",
  }).format(value);

const formatSalaryRange = (job: JobRecord) => {
  if (job.salaryMin == null && job.salaryMax == null) {
    return "Compensation not set";
  }

  if (job.salaryMin != null && job.salaryMax != null) {
    return `${formatMoney(job.salaryMin, job.currency)} - ${formatMoney(
      job.salaryMax,
      job.currency,
    )}`;
  }

  return formatMoney(job.salaryMin ?? job.salaryMax ?? 0, job.currency);
};

const formatPlacementFee = (value: number | null) =>
  value == null ? "Not set" : `${value}%`;

const formatNumberInputValue = (value: number | null) =>
  value == null ? "" : String(value);

const formatDateInputValue = (value: string | null) =>
  value ? value.slice(0, 10) : "";

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

const HiddenJobMutationFields = ({ job }: { job: JobRecord }) => (
  <>
    <input type="hidden" name="jobId" value={job.id} />
    <input type="hidden" name="clientId" value={job.clientId} />
    <input type="hidden" name="currency" value={job.currency ?? "USD"} />
    <input type="hidden" name="department" value={job.department ?? ""} />
    <input type="hidden" name="description" value={job.description ?? ""} />
    <input type="hidden" name="employmentType" value={job.employmentType ?? ""} />
    <input
      type="hidden"
      name="headcount"
      value={formatNumberInputValue(job.headcount)}
    />
    <input type="hidden" name="intakeSummary" value={job.intakeSummary ?? ""} />
    <input type="hidden" name="location" value={job.location ?? ""} />
    <input type="hidden" name="ownerUserId" value={job.ownerUserId ?? ""} />
    <input
      type="hidden"
      name="placementFeePercent"
      value={formatNumberInputValue(job.placementFeePercent)}
    />
    <input
      type="hidden"
      name="salaryMax"
      value={formatNumberInputValue(job.salaryMax)}
    />
    <input
      type="hidden"
      name="salaryMin"
      value={formatNumberInputValue(job.salaryMin)}
    />
    <input
      type="hidden"
      name="targetFillDate"
      value={formatDateInputValue(job.targetFillDate)}
    />
    <input type="hidden" name="title" value={job.title} />
  </>
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
      <form action={updateJobControlsAction} className="space-y-4">
        <HiddenJobMutationFields job={job} />

        <label className="block space-y-2">
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Status
          </span>
          <select
            className="input"
            name="status"
            defaultValue={job.status}
            required
          >
            {apiJobStatusValues.map((status) => (
              <option key={status} value={status}>
                {toTitleCase(status)}
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
            name="priority"
            defaultValue={job.priority}
            required
          >
            {apiJobPriorityValues.map((priority) => (
              <option key={priority} value={priority}>
                {toTitleCase(priority)}
              </option>
            ))}
          </select>
        </label>

        <Button type="submit" className="w-full rounded-full">
          Save controls
        </Button>
      </form>
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

const JobDetailPage = async ({ params }: PageProps) => {
  const { jobId } = await params;
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

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-5">
          <Card className="overflow-hidden">
            <CardHeader>
              <div className="flex flex-wrap items-center gap-2">
                <Badge className={statusToneMap[job.status]}>
                  {toTitleCase(job.status)}
                </Badge>
                <Badge className={priorityToneMap[job.priority]}>
                  {toTitleCase(job.priority)} priority
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
                value={formatDate(job.targetFillDate)}
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
                value={formatSalaryRange(job)}
              />
              <DetailTile
                icon={<BriefcaseBusiness className="size-3.5" />}
                label="Headcount"
                value={job.headcount == null ? "Not set" : String(job.headcount)}
              />
              <DetailTile
                icon={<ClipboardList className="size-3.5" />}
                label="Placement fee"
                value={formatPlacementFee(job.placementFeePercent)}
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
                value={formatDate(job.openedAt)}
              />
              <DetailTile
                icon={<CalendarClock className="size-3.5" />}
                label="Updated"
                value={formatDate(job.updatedAt)}
              />
              <DetailTile
                icon={<CalendarClock className="size-3.5" />}
                label="Created"
                value={formatDate(job.createdAt)}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="size-4" />
                Pipeline handoff
              </CardTitle>
              <CardDescription>
                Read-only boundary marker for future submission work.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-[1.35rem] border border-dashed border-border bg-surface-1/60 p-5">
                <p className="text-sm font-medium text-foreground">
                  Submission board stays downstream.
                </p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  This detail page confirms the job, owner, client, and stage
                  template are ready. Candidate submissions and stage movement
                  remain owned by the submission-pipeline branch.
                </p>
              </div>
            </CardContent>
          </Card>
        </aside>
      </div>
    </section>
  );
};

export default JobDetailPage;
