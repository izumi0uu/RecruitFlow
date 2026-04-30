import {
  apiJobPriorityValues,
  apiJobSortValues,
  apiJobStatusValues,
  type ApiJobPriority,
  type ApiJobSort,
  type ApiJobStatus,
} from "@recruitflow/contracts";

type SearchParamRecord = Record<string, string | string[] | undefined>;

type SearchParamReader = {
  get: (name: string) => string | null;
};

export type JobListFilters = {
  clientId: string;
  owner: string;
  page: string;
  priority: "" | ApiJobPriority;
  q: string;
  sort: ApiJobSort;
  status: "" | ApiJobStatus;
};

type JobListFilterInput = Partial<
  Record<keyof JobListFilters, string | null | undefined>
>;

const EMPTY_JOB_FILTERS: JobListFilters = {
  clientId: "",
  owner: "",
  page: "",
  priority: "",
  q: "",
  sort: "opened_desc",
  status: "",
};

const getSingleRecordValue = (
  value: string | string[] | undefined,
) => {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
};

const normalizeTextValue = (value: string | null | undefined) =>
  value?.trim() ?? "";

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

const normalizeStatusValue = (value: string | null | undefined) => {
  const normalizedValue = normalizeTextValue(value);

  return apiJobStatusValues.includes(normalizedValue as ApiJobStatus)
    ? (normalizedValue as ApiJobStatus)
    : "";
};

const normalizePriorityValue = (value: string | null | undefined) => {
  const normalizedValue = normalizeTextValue(value);

  return apiJobPriorityValues.includes(normalizedValue as ApiJobPriority)
    ? (normalizedValue as ApiJobPriority)
    : "";
};

const normalizeSortValue = (value: string | null | undefined) => {
  const normalizedValue = normalizeTextValue(value);

  return apiJobSortValues.includes(normalizedValue as ApiJobSort)
    ? (normalizedValue as ApiJobSort)
    : "opened_desc";
};

export const normalizeJobListFilters = (
  filters: JobListFilterInput,
): JobListFilters => ({
  clientId: normalizeUuidValue(filters.clientId),
  owner: normalizeUuidValue(filters.owner),
  page: normalizePageValue(filters.page),
  priority: normalizePriorityValue(filters.priority),
  q: normalizeTextValue(filters.q),
  sort: normalizeSortValue(filters.sort),
  status: normalizeStatusValue(filters.status),
});

export const parseJobListFiltersFromRecord = (
  params: SearchParamRecord,
) =>
  normalizeJobListFilters({
    clientId: getSingleRecordValue(params.clientId),
    owner: getSingleRecordValue(params.owner),
    page: getSingleRecordValue(params.page),
    priority: getSingleRecordValue(params.priority),
    q: getSingleRecordValue(params.q),
    sort: getSingleRecordValue(params.sort),
    status: getSingleRecordValue(params.status),
  });

export const parseJobListFiltersFromSearchParams = (
  params: SearchParamReader,
) =>
  normalizeJobListFilters({
    clientId: params.get("clientId"),
    owner: params.get("owner"),
    page: params.get("page"),
    priority: params.get("priority"),
    q: params.get("q"),
    sort: params.get("sort"),
    status: params.get("status"),
  });

export const jobListFiltersToSearchParams = (
  filters: JobListFilters,
  options: { includePageSize?: boolean } = {},
) => {
  const normalizedFilters = normalizeJobListFilters(filters);
  const params = new URLSearchParams();

  if (normalizedFilters.q) params.set("q", normalizedFilters.q);
  if (normalizedFilters.clientId) params.set("clientId", normalizedFilters.clientId);
  if (normalizedFilters.status) params.set("status", normalizedFilters.status);
  if (normalizedFilters.owner) params.set("owner", normalizedFilters.owner);
  if (normalizedFilters.priority) params.set("priority", normalizedFilters.priority);
  if (normalizedFilters.sort !== "opened_desc") {
    params.set("sort", normalizedFilters.sort);
  }
  if (normalizedFilters.page) params.set("page", normalizedFilters.page);
  if (options.includePageSize) params.set("pageSize", "20");

  return params;
};

export const areJobListFiltersEqual = (
  first: JobListFilters,
  second: JobListFilters,
) =>
  first.clientId === second.clientId &&
  first.owner === second.owner &&
  first.page === second.page &&
  first.priority === second.priority &&
  first.q === second.q &&
  first.sort === second.sort &&
  first.status === second.status;

export { EMPTY_JOB_FILTERS };
