import { redirect } from "next/navigation";

import type { SubmissionsListResponse } from "@recruitflow/contracts";

import { isApiRequestError, requestApiJson } from "@/lib/api/client";
import {
  parseSubmissionPipelineFiltersFromRecord,
  submissionPipelineFiltersToSearchParams,
} from "@/lib/submissions/filters";

import { SubmissionPipelineSurface } from "./components/SubmissionPipelineSurface";

type PageProps = {
  searchParams?:
    | Promise<Record<string, string | string[] | undefined>>
    | Record<string, string | string[] | undefined>;
};

const getSubmissionsList = async (
  filters: ReturnType<typeof parseSubmissionPipelineFiltersFromRecord>,
) => {
  try {
    const params = submissionPipelineFiltersToSearchParams(filters, {
      includePageSize: true,
      target: "api",
    });
    const queryString = params.toString();

    return await requestApiJson<SubmissionsListResponse>(
      `/submissions${queryString ? `?${queryString}` : ""}`,
    );
  } catch (error) {
    if (isApiRequestError(error) && error.status === 401) {
      redirect("/sign-in");
    }

    throw error;
  }
};

const PipelinePage = async ({ searchParams }: PageProps) => {
  const params = await Promise.resolve(searchParams ?? {});
  const initialFilters = parseSubmissionPipelineFiltersFromRecord(params);
  const initialData = await getSubmissionsList(initialFilters);

  return (
    <SubmissionPipelineSurface
      initialData={initialData}
      initialFilters={initialFilters}
    />
  );
};

export default PipelinePage;
