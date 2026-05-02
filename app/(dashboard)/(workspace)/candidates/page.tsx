import {
  parseCandidateListFiltersFromRecord,
} from "@/lib/candidates/filters";

import { CandidatesListSurface } from "./components/CandidatesListSurface";

type PageProps = {
  searchParams?:
    | Promise<Record<string, string | string[] | undefined>>
    | Record<string, string | string[] | undefined>;
};

const CandidatesPage = async ({ searchParams }: PageProps) => {
  const params = await Promise.resolve(searchParams ?? {});
  const initialFilters = parseCandidateListFiltersFromRecord(params);

  return <CandidatesListSurface initialFilters={initialFilters} />;
};

export default CandidatesPage;
