import {
  type ApiTaskEntityType,
  type ApiTaskStatus,
  type ApiTaskView,
  apiTaskEntityTypeValues,
  apiTaskStatusValues,
  apiTaskViewValues,
} from "@recruitflow/contracts";

type SearchParamRecord = Record<string, string | string[] | undefined>;

type SearchParamReader = {
  get: (name: string) => string | null;
};

export type TaskListFilters = {
  entityId: string;
  entityType: "" | ApiTaskEntityType;
  owner: string;
  page: string;
  q: string;
  status: "" | ApiTaskStatus;
  view: ApiTaskView;
};

type TaskListFilterInput = Partial<
  Record<keyof TaskListFilters, string | null | undefined>
>;

const EMPTY_TASK_FILTERS: TaskListFilters = {
  entityId: "",
  entityType: "",
  owner: "",
  page: "",
  q: "",
  status: "",
  view: "mine",
};

const getSingleRecordValue = (value: string | string[] | undefined) => {
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

const normalizeTaskViewValue = (value: string | null | undefined) => {
  const normalizedValue = normalizeTextValue(value);

  return apiTaskViewValues.includes(normalizedValue as ApiTaskView)
    ? (normalizedValue as ApiTaskView)
    : "mine";
};

const normalizeTaskStatusValue = (value: string | null | undefined) => {
  const normalizedValue = normalizeTextValue(value);

  return apiTaskStatusValues.includes(normalizedValue as ApiTaskStatus)
    ? (normalizedValue as ApiTaskStatus)
    : "";
};

const normalizeTaskEntityTypeValue = (value: string | null | undefined) => {
  const normalizedValue = normalizeTextValue(value);

  return apiTaskEntityTypeValues.includes(normalizedValue as ApiTaskEntityType)
    ? (normalizedValue as ApiTaskEntityType)
    : "";
};

export const normalizeTaskListFilters = (
  filters: TaskListFilterInput,
): TaskListFilters => ({
  entityId: normalizeUuidValue(filters.entityId),
  entityType: normalizeTaskEntityTypeValue(filters.entityType),
  owner: normalizeUuidValue(filters.owner),
  page: normalizePageValue(filters.page),
  q: normalizeTextValue(filters.q),
  status: normalizeTaskStatusValue(filters.status),
  view: normalizeTaskViewValue(filters.view),
});

export const parseTaskListFiltersFromRecord = (params: SearchParamRecord) =>
  normalizeTaskListFilters({
    entityId: getSingleRecordValue(params.entityId),
    entityType: getSingleRecordValue(params.entityType),
    owner: getSingleRecordValue(params.owner),
    page: getSingleRecordValue(params.page),
    q: getSingleRecordValue(params.q),
    status: getSingleRecordValue(params.status),
    view: getSingleRecordValue(params.view),
  });

export const parseTaskListFiltersFromSearchParams = (
  params: SearchParamReader,
) =>
  normalizeTaskListFilters({
    entityId: params.get("entityId"),
    entityType: params.get("entityType"),
    owner: params.get("owner"),
    page: params.get("page"),
    q: params.get("q"),
    status: params.get("status"),
    view: params.get("view"),
  });

export const taskListFiltersToSearchParams = (
  filters: TaskListFilters,
  options: { includePageSize?: boolean } = {},
) => {
  const normalizedFilters = normalizeTaskListFilters(filters);
  const params = new URLSearchParams();

  if (normalizedFilters.view !== "mine") {
    params.set("view", normalizedFilters.view);
  }
  if (normalizedFilters.q) params.set("q", normalizedFilters.q);
  if (normalizedFilters.owner) params.set("owner", normalizedFilters.owner);
  if (normalizedFilters.entityType) {
    params.set("entityType", normalizedFilters.entityType);
  }
  if (normalizedFilters.entityId)
    params.set("entityId", normalizedFilters.entityId);
  if (normalizedFilters.status) params.set("status", normalizedFilters.status);
  if (normalizedFilters.page) params.set("page", normalizedFilters.page);
  if (options.includePageSize) params.set("pageSize", "20");

  return params;
};

export const areTaskListFiltersEqual = (
  first: TaskListFilters,
  second: TaskListFilters,
) =>
  first.entityId === second.entityId &&
  first.entityType === second.entityType &&
  first.owner === second.owner &&
  first.page === second.page &&
  first.q === second.q &&
  first.status === second.status &&
  first.view === second.view;

export { EMPTY_TASK_FILTERS };
