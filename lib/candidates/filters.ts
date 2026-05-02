type SearchParamRecord = Record<string, string | string[] | undefined>;

type SearchParamReader = {
  get: (name: string) => string | null;
};

export type CandidateListFilters = {
  hasResume: "" | "false" | "true";
  location: string;
  owner: string;
  page: string;
  q: string;
  source: string;
};

type CandidateListFilterInput = Partial<
  Record<keyof CandidateListFilters, string | null | undefined>
>;

const EMPTY_CANDIDATE_FILTERS: CandidateListFilters = {
  hasResume: "",
  location: "",
  owner: "",
  page: "",
  q: "",
  source: "",
};

const getSingleRecordValue = (
  value: string | string[] | undefined,
) => {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
};

const normalizeTextValue = (value: string | null | undefined) => {
  return value?.trim() ?? "";
};

const normalizeUuidValue = (value: string | null | undefined) => {
  const normalizedValue = normalizeTextValue(value);

  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    normalizedValue,
  )
    ? normalizedValue
    : "";
};

const normalizePageValue = (value: string | null | undefined) => {
  const normalizedValue = normalizeTextValue(value);
  const page = Number(normalizedValue);

  return Number.isInteger(page) && page > 1 ? String(page) : "";
};

const normalizeHasResumeValue = (value: string | null | undefined) => {
  const normalizedValue = normalizeTextValue(value);

  return normalizedValue === "true" || normalizedValue === "false"
    ? normalizedValue
    : "";
};

export const normalizeCandidateListFilters = (
  filters: CandidateListFilterInput,
): CandidateListFilters => ({
  hasResume: normalizeHasResumeValue(filters.hasResume),
  location: normalizeTextValue(filters.location),
  owner: normalizeUuidValue(filters.owner),
  page: normalizePageValue(filters.page),
  q: normalizeTextValue(filters.q),
  source: normalizeTextValue(filters.source),
});

export const parseCandidateListFiltersFromRecord = (
  params: SearchParamRecord,
) =>
  normalizeCandidateListFilters({
    hasResume: getSingleRecordValue(params.hasResume),
    location: getSingleRecordValue(params.location),
    owner: getSingleRecordValue(params.owner),
    page: getSingleRecordValue(params.page),
    q: getSingleRecordValue(params.q),
    source: getSingleRecordValue(params.source),
  });

export const parseCandidateListFiltersFromSearchParams = (
  params: SearchParamReader,
) =>
  normalizeCandidateListFilters({
    hasResume: params.get("hasResume"),
    location: params.get("location"),
    owner: params.get("owner"),
    page: params.get("page"),
    q: params.get("q"),
    source: params.get("source"),
  });

export const candidateListFiltersToSearchParams = (
  filters: CandidateListFilters,
  options: { includePageSize?: boolean } = {},
) => {
  const normalizedFilters = normalizeCandidateListFilters(filters);
  const params = new URLSearchParams();

  if (normalizedFilters.q) params.set("q", normalizedFilters.q);
  if (normalizedFilters.owner) params.set("owner", normalizedFilters.owner);
  if (normalizedFilters.source) params.set("source", normalizedFilters.source);
  if (normalizedFilters.location) {
    params.set("location", normalizedFilters.location);
  }
  if (normalizedFilters.hasResume) {
    params.set("hasResume", normalizedFilters.hasResume);
  }
  if (normalizedFilters.page) params.set("page", normalizedFilters.page);
  if (options.includePageSize) params.set("pageSize", "20");

  return params;
};

export const areCandidateListFiltersEqual = (
  first: CandidateListFilters,
  second: CandidateListFilters,
) =>
  first.hasResume === second.hasResume &&
  first.location === second.location &&
  first.owner === second.owner &&
  first.page === second.page &&
  first.q === second.q &&
  first.source === second.source;

export { EMPTY_CANDIDATE_FILTERS };
