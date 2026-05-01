import { redirect } from "next/navigation";

import type { CandidatesListResponse } from "@recruitflow/contracts";

import { isApiRequestError, requestApiJson } from "@/lib/api/client";
import {
  candidateListFiltersToSearchParams,
  parseCandidateListFiltersFromRecord,
  type CandidateListFilters,
} from "@/lib/candidates/filters";

import { CandidatesListSurface } from "./components/CandidatesListSurface";

type PageProps = {
  searchParams?:
    | Promise<Record<string, string | string[] | undefined>>
    | Record<string, string | string[] | undefined>;
};

const buildCandidatesApiPath = (filters: CandidateListFilters) => {
  const queryString = candidateListFiltersToSearchParams(filters, {
    includePageSize: true,
  }).toString();

  return `/candidates${queryString ? `?${queryString}` : ""}`;
};

const getCandidatesList = async (filters: CandidateListFilters) => {
  try {
    return await requestApiJson<CandidatesListResponse>(
      buildCandidatesApiPath(filters),
    );
  } catch (error) {
    if (isApiRequestError(error) && error.status === 401) {
      redirect("/sign-in");
    }

    throw error;
  }
};

const CandidatesPage = async ({ searchParams }: PageProps) => {
  const params = await Promise.resolve(searchParams ?? {});
  const initialFilters = parseCandidateListFiltersFromRecord(params);
  const candidatesList = await getCandidatesList(initialFilters);

  return (
    <CandidatesListSurface
      initialData={candidatesList}
      initialFilters={initialFilters}
    />
  );
};

export default CandidatesPage;
