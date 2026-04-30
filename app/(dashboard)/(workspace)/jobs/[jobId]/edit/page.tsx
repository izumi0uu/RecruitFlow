import { notFound, redirect } from "next/navigation";

import type { JobDetailResponse } from "@recruitflow/contracts";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { WorkspacePageHeader } from "@/components/workspace/WorkspacePageHeader";
import { isApiRequestError, requestApiJson } from "@/lib/api/client";

import { updateJobAction } from "../../actions";
import {
  buildJobFormValues,
  formatDateInputValue,
  JobForm,
  numericJobFormValue,
} from "../../JobForm";

type PageProps = {
  params: Promise<{
    jobId: string;
  }>;
  searchParams?:
    | Promise<Record<string, string | string[] | undefined>>
    | Record<string, string | string[] | undefined>;
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

const hasCreatedFlag = (params: Record<string, string | string[] | undefined>) => {
  const created = params.created;

  return Array.isArray(created) ? created[0] === "1" : created === "1";
};

const EditJobPage = async ({ params, searchParams }: PageProps) => {
  const { jobId } = await params;
  const urlParams = await Promise.resolve(searchParams ?? {});
  const { clientOptions, job, ownerOptions } = await getJobForEdit(jobId);

  return (
    <section className="space-y-6 px-0 py-1 lg:py-2">
      <WorkspacePageHeader
        kicker="Job maintenance"
        title={`Edit ${job.title}`}
        description="Update the structured requisition baseline without crossing into stage-template initialization or full job detail composition."
      />

      {hasCreatedFlag(urlParams) ? (
        <p className="status-message status-success">
          Job created. RF-26 will add the dedicated job detail overview; for
          now this edit screen is the stable post-save checkpoint.
        </p>
      ) : null}

      <Card className="max-w-5xl">
        <CardHeader>
          <CardTitle>Job intake baseline</CardTitle>
          <CardDescription>
            These fields feed the jobs list and prepare the record for RF-24
            stage initialization and RF-26 detail overview work.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <JobForm
            action={updateJobAction}
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
              placementFeePercent: numericJobFormValue(job.placementFeePercent),
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
    </section>
  );
};

export default EditJobPage;
