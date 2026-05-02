import {
  apiDocumentEntityTypeValues,
  apiDocumentTypeValues,
  type ApiDocumentEntityType,
  type ApiDocumentType,
} from "@recruitflow/contracts";

type SearchParamRecord = Record<string, string | string[] | undefined>;

type SearchParamReader = {
  get: (name: string) => string | null;
};

export type DocumentListFilters = {
  entityId: string;
  entityType: ApiDocumentEntityType | "";
  page: string;
  type: ApiDocumentType | "";
};

type DocumentListFilterInput = Partial<
  Record<keyof DocumentListFilters, string | null | undefined>
>;

const EMPTY_DOCUMENT_FILTERS: DocumentListFilters = {
  entityId: "",
  entityType: "",
  page: "",
  type: "",
};

const getSingleRecordValue = (value: string | string[] | undefined) => {
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

const normalizeDocumentTypeValue = (
  value: string | null | undefined,
): ApiDocumentType | "" => {
  const normalizedValue = normalizeTextValue(value);

  return apiDocumentTypeValues.includes(normalizedValue as ApiDocumentType)
    ? (normalizedValue as ApiDocumentType)
    : "";
};

const normalizeEntityTypeValue = (
  value: string | null | undefined,
): ApiDocumentEntityType | "" => {
  const normalizedValue = normalizeTextValue(value);

  return apiDocumentEntityTypeValues.includes(
    normalizedValue as ApiDocumentEntityType,
  )
    ? (normalizedValue as ApiDocumentEntityType)
    : "";
};

export const normalizeDocumentListFilters = (
  filters: DocumentListFilterInput,
): DocumentListFilters => ({
  entityId: normalizeUuidValue(filters.entityId),
  entityType: normalizeEntityTypeValue(filters.entityType),
  page: normalizePageValue(filters.page),
  type: normalizeDocumentTypeValue(filters.type),
});

export const parseDocumentListFiltersFromRecord = (
  params: SearchParamRecord,
) =>
  normalizeDocumentListFilters({
    entityId: getSingleRecordValue(params.entityId),
    entityType: getSingleRecordValue(params.entityType),
    page: getSingleRecordValue(params.page),
    type: getSingleRecordValue(params.type),
  });

export const parseDocumentListFiltersFromSearchParams = (
  params: SearchParamReader,
) =>
  normalizeDocumentListFilters({
    entityId: params.get("entityId"),
    entityType: params.get("entityType"),
    page: params.get("page"),
    type: params.get("type"),
  });

export const documentListFiltersToSearchParams = (
  filters: DocumentListFilters,
  options: { includePageSize?: boolean } = {},
) => {
  const normalizedFilters = normalizeDocumentListFilters(filters);
  const params = new URLSearchParams();

  if (normalizedFilters.type) params.set("type", normalizedFilters.type);
  if (normalizedFilters.entityType) {
    params.set("entityType", normalizedFilters.entityType);
  }
  if (normalizedFilters.entityId) {
    params.set("entityId", normalizedFilters.entityId);
  }
  if (normalizedFilters.page) params.set("page", normalizedFilters.page);
  if (options.includePageSize) params.set("pageSize", "20");

  return params;
};

export const areDocumentListFiltersEqual = (
  first: DocumentListFilters,
  second: DocumentListFilters,
) =>
  first.entityId === second.entityId &&
  first.entityType === second.entityType &&
  first.page === second.page &&
  first.type === second.type;

export { EMPTY_DOCUMENT_FILTERS };
