import type {
  JobDetailResponse,
  JobStageTemplateSummary,
} from "@recruitflow/contracts";
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

import { JobFormController } from "../../components/JobFormController";
import { JobMutationRestrictedState } from "../../components/JobMutationRestrictedState";
import { JobStageTemplateRepairControl } from "../../components/JobStageTemplateRepairControl";
import {
  buildJobFormValues,
  formatDateInputValue,
  numericJobFormValue,
} from "../../utils";

type PageProps = {
  params: Promise<{
    jobId: string;
  }>;
  searchParams?:
    | Promise<Record<string, string | string[] | undefined>>
    | Record<string, string | string[] | undefined>;
};

const StageTemplateCard = ({
  canRepair,
  jobId,
  stageTemplate,
}: {
  canRepair: boolean;
  jobId: string;
  stageTemplate: JobStageTemplateSummary;
}) => {
  const labelsByKey = new Map(
    stageTemplate.expectedStages.map((stage) => [stage.key, stage.label]),
  );
  const missingLabels = stageTemplate.missingStageKeys.map(
    (key) => labelsByKey.get(key) ?? key,
  );

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Default stage template</CardTitle>
        <CardDescription>
          RF-24 keeps every job aligned to the shared submission-stage contract
          before the pipeline branch consumes it.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {stageTemplate.expectedStages.map((stage) => {
            const isPresent = stageTemplate.stages.some(
              (existingStage) => existingStage.key === stage.key,
            );

            return (
              <span
                key={stage.key}
                className={
                  isPresent
                    ? "rounded-full border border-border/70 bg-surface-1 px-3 py-1 text-xs font-medium text-foreground"
                    : "rounded-full border border-amber-300/70 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-900"
                }
              >
                {stage.sortOrder}. {stage.label}
              </span>
            );
          })}
        </div>

        {stageTemplate.status === "complete" ? (
          <p className="text-sm leading-6 text-muted-foreground">
            This job has the full default stage sequence. The submission branch
            can rely on this job as a stable pipeline container.
          </p>
        ) : (
          <div className="rounded-[1.35rem] border border-amber-300/70 bg-amber-50 p-4 text-amber-950">
            <p className="text-sm font-semibold">
              Stage template needs repair.
            </p>
            <p className="mt-2 text-sm leading-6">
              Missing stages: {missingLabels.join(", ")}. Repair inserts only
              missing default rows and keeps existing rows untouched.
            </p>
            {canRepair ? (
              <JobStageTemplateRepairControl jobId={jobId} />
            ) : (
              <p className="mt-3 text-xs leading-5">
                Coordinators can see this warning, but an owner or recruiter
                must repair the stage template.
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const getJobForEdit = async (jobId: string) => {
  try {
    return await requestApiJson<JobDetailResponse>(`/jobs/${jobId}`);
  } catch (error) {
    if (isApiRequestError(error)) {
      if (error.status === 401) {
        redirect("/sign-in");
      }

      if (error.status === 404) {
        notFound();
      }
    }

    throw error;
  }
};

const hasCreatedFlag = (
  params: Record<string, string | string[] | undefined>,
) => {
  const created = params.created;

  return Array.isArray(created) ? created[0] === "1" : created === "1";
};

const hasRestrictedFlag = (
  params: Record<string, string | string[] | undefined>,
) => {
  const restricted = params.restricted;

  return Array.isArray(restricted) ? restricted[0] === "1" : restricted === "1";
};

const EditJobPage = async ({ params, searchParams }: PageProps) => {
  const { jobId } = await params;
  const urlParams = await Promise.resolve(searchParams ?? {});
  const { clientOptions, context, job, ownerOptions, stageTemplate } =
    await getJobForEdit(jobId);

  return (
    <section className="space-y-6 px-0 py-1 lg:py-2">
      <WorkspacePageHeader
        kicker="Job maintenance"
        title={`Edit ${job.title}`}
        description="Update the structured requisition baseline and verify the default stage container that downstream submissions will use."
      />

      {hasRestrictedFlag(urlParams) ? (
        <p className="status-message status-error">
          Only owners and recruiters can save job intake changes or repair stage
          templates.
        </p>
      ) : null}

      {hasCreatedFlag(urlParams) ? (
        <p className="status-message status-success">
          Job created. You can keep editing here or open the dedicated job
          overview.
          <Button
            asChild
            size="sm"
            variant="outline"
            className="ml-2 rounded-full"
          >
            <TrackedLink href={`/jobs/${job.id}`}>Open overview</TrackedLink>
          </Button>
        </p>
      ) : null}

      {context.role === "coordinator" ? (
        <JobMutationRestrictedState
          backHref={`/jobs/${job.id}`}
          backLabel="Open read-only overview"
          description="This edit route intentionally renders a restricted state for coordinators. They can review intake details and stage-template health from the overview, while owner/recruiter users perform audited mutations."
          title="Edit job is restricted"
        />
      ) : (
        <>
          <StageTemplateCard
            canRepair
            jobId={job.id}
            stageTemplate={stageTemplate}
          />

          <Card className="w-full">
            <CardHeader>
              <CardTitle>Job intake baseline</CardTitle>
              <CardDescription>
                These fields feed the jobs list, dedicated overview, and
                downstream stage/submission handoff surfaces.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <JobFormController
                clientOptions={clientOptions}
                initialValues={buildJobFormValues({
                  clientId: job.clientId,
                  currency: job.currency ?? "USD",
                  department: job.department ?? "",
                  description: job.description ?? "",
                  employmentType: job.employmentType ?? "",
                  headcount: numericJobFormValue(job.headcount),
                  intakeSummary: job.intakeSummary ?? "",
                  location: job.location ?? "",
                  ownerUserId: job.ownerUserId ?? ownerOptions[0]?.id ?? "",
                  placementFeePercent: numericJobFormValue(
                    job.placementFeePercent,
                  ),
                  priority: job.priority,
                  salaryMax: numericJobFormValue(job.salaryMax),
                  salaryMin: numericJobFormValue(job.salaryMin),
                  status: job.status,
                  targetFillDate: formatDateInputValue(job.targetFillDate),
                  title: job.title,
                })}
                jobId={job.id}
                mode="edit"
                ownerOptions={ownerOptions}
              />
            </CardContent>
          </Card>
        </>
      )}
    </section>
  );
};

export default EditJobPage;
