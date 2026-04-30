import { redirect } from "next/navigation";

import type {
  CurrentMembershipResponse,
  JobsListResponse,
} from "@recruitflow/contracts";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { WorkspacePageHeader } from "@/components/workspace/WorkspacePageHeader";
import { isApiRequestError, requestApiJson } from "@/lib/api/client";

import { createJobAction } from "../actions";
import {
  buildJobFormValues,
  emptyJobFormValues,
  JobForm,
} from "../JobForm";

type PageProps = {
  searchParams?:
    | Promise<Record<string, string | string[] | undefined>>
    | Record<string, string | string[] | undefined>;
};

const getSingleParamValue = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

const getCreateJobContext = async () => {
  try {
    const [jobsList, membership] = await Promise.all([
      requestApiJson<JobsListResponse>("/jobs?pageSize=1"),
      requestApiJson<CurrentMembershipResponse>("/memberships/current"),
    ]);

    return {
      clientOptions: jobsList.clientOptions,
      membership,
      ownerOptions: jobsList.ownerOptions,
    };
  } catch (error) {
    if (isApiRequestError(error) && error.status === 401) {
      redirect("/sign-in");
    }

    throw error;
  }
};

const NewJobPage = async ({ searchParams }: PageProps) => {
  const params = await Promise.resolve(searchParams ?? {});
  const requestedClientId = getSingleParamValue(params.clientId);
  const { clientOptions, membership, ownerOptions } =
    await getCreateJobContext();
  const initialClientId = clientOptions.some(
    (client) => client.id === requestedClientId,
  )
    ? requestedClientId ?? ""
    : "";

  return (
    <section className="space-y-6 px-0 py-1 lg:py-2">
      <WorkspacePageHeader
        kicker="New requisition"
        title="Create job"
        description="Capture the structured role intake fields and automatically prepare the default submission-stage container."
      />

      <Card className="max-w-5xl">
        <CardHeader>
          <CardTitle>Job intake baseline</CardTitle>
          <CardDescription>
            The API validates client and owner scope, then creates the default
            stage sequence in the same job creation flow.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <JobForm
            action={createJobAction}
            clientOptions={clientOptions}
            initialValues={buildJobFormValues({
              ...emptyJobFormValues,
              clientId: initialClientId,
              ownerUserId: membership.userId,
            })}
            mode="create"
            ownerOptions={ownerOptions}
          />
        </CardContent>
      </Card>
    </section>
  );
};

export default NewJobPage;
