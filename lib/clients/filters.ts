import {
  apiClientPriorityValues,
  apiClientStatusValues,
  type ApiClientPriority,
  type ApiClientStatus,
} from "@recruitflow/contracts";

type SearchParamRecord = Record<string, string | string[] | undefined>;

type SearchParamReader = {
  get: (name: string) => string | null;
};

export type ClientListFilters = {
  owner: string;
  page: string;
  priority: "" | ApiClientPriority;
  q: string;
  status: "" | ApiClientStatus;
};

type ClientListFilterInput = Partial<
  Record<keyof ClientListFilters, string | null | undefined>
>;

const EMPTY_CLIENT_FILTERS: ClientListFilters = {
  owner: "",
  page: "",
  priority: "",
  q: "",
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

const normalizeStatusValue = (value: string | null | undefined) => {
  const normalizedValue = normalizeTextValue(value);

  return apiClientStatusValues.includes(normalizedValue as ApiClientStatus)
    ? (normalizedValue as ApiClientStatus)
    : "";
};

const normalizePriorityValue = (value: string | null | undefined) => {
  const normalizedValue = normalizeTextValue(value);

  return apiClientPriorityValues.includes(normalizedValue as ApiClientPriority)
    ? (normalizedValue as ApiClientPriority)
    : "";
};

export const normalizeClientListFilters = (
  filters: ClientListFilterInput,
): ClientListFilters => ({
  owner: normalizeUuidValue(filters.owner),
  page: normalizePageValue(filters.page),
  priority: normalizePriorityValue(filters.priority),
  q: normalizeTextValue(filters.q),
  status: normalizeStatusValue(filters.status),
});

export const parseClientListFiltersFromRecord = (
  params: SearchParamRecord,
) =>
  normalizeClientListFilters({
    owner: getSingleRecordValue(params.owner),
    page: getSingleRecordValue(params.page),
    priority: getSingleRecordValue(params.priority),
    q: getSingleRecordValue(params.q),
    status: getSingleRecordValue(params.status),
  });

export const parseClientListFiltersFromSearchParams = (
  params: SearchParamReader,
) =>
  normalizeClientListFilters({
    owner: params.get("owner"),
    page: params.get("page"),
    priority: params.get("priority"),
    q: params.get("q"),
    status: params.get("status"),
  });

export const clientListFiltersToSearchParams = (
  filters: ClientListFilters,
  options: { includePageSize?: boolean } = {},
) => {
  const normalizedFilters = normalizeClientListFilters(filters);
  const params = new URLSearchParams();

  if (normalizedFilters.q) params.set("q", normalizedFilters.q);
  if (normalizedFilters.status) params.set("status", normalizedFilters.status);
  if (normalizedFilters.owner) params.set("owner", normalizedFilters.owner);
  if (normalizedFilters.priority) {
    params.set("priority", normalizedFilters.priority);
  }
  if (normalizedFilters.page) params.set("page", normalizedFilters.page);
  if (options.includePageSize) params.set("pageSize", "20");

  return params;
};

export const areClientListFiltersEqual = (
  first: ClientListFilters,
  second: ClientListFilters,
) =>
  first.owner === second.owner &&
  first.page === second.page &&
  first.priority === second.priority &&
  first.q === second.q &&
  first.status === second.status;

export { EMPTY_CLIENT_FILTERS };
