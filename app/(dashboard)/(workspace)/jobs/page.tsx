import { redirect } from "next/navigation";

import type { JobsListResponse } from "@recruitflow/contracts";

import { isApiRequestError, requestApiJson } from "@/lib/api/client";
import {
  jobListFiltersToSearchParams,
  parseJobListFiltersFromRecord,
  type JobListFilters,
} from "@/lib/jobs/filters";

import { JobsListSurface } from "./components/JobsListSurface";

type PageProps = {
  searchParams?:
    | Promise<Record<string, string | string[] | undefined>>
    | Record<string, string | string[] | undefined>;
};

const buildJobsApiPath = (filters: JobListFilters) => {
  const queryString = jobListFiltersToSearchParams(filters, {
    includePageSize: true,
  }).toString();

  return `/jobs${queryString ? `?${queryString}` : ""}`;
};

const getJobsList = async (filters: JobListFilters) => {
  try {
    return await requestApiJson<JobsListResponse>(buildJobsApiPath(filters));
  } catch (error) {
    if (isApiRequestError(error) && error.status === 401) {
      redirect("/sign-in");
    }

    throw error;
  }
};

const JobsPage = async ({ searchParams }: PageProps) => {
  const params = await Promise.resolve(searchParams ?? {});
  const initialFilters = parseJobListFiltersFromRecord(params);
  const jobsList = await getJobsList(initialFilters);

  return (
    <JobsListSurface
      initialData={jobsList}
      initialFilters={initialFilters}
    />
  );
};

export default JobsPage;
