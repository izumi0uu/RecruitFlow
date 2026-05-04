import {
  apiRiskFlagValues,
  apiSubmissionStageValues,
  type ApiRiskFlag,
  type ApiSubmissionStage,
} from "@recruitflow/contracts";

type SearchParamRecord = Record<string, string | string[] | undefined>;

type SearchParamReader = {
  get: (name: string) => string | null;
};

export type SubmissionPipelineView = "board" | "list";

export type SubmissionPipelineFilters = {
  candidateId: string;
  clientId: string;
  jobId: string;
  owner: string;
  q: string;
  risk: "" | ApiRiskFlag;
  stage: "" | ApiSubmissionStage;
  submissionCreated: "" | "1";
  submissionId: string;
  view: SubmissionPipelineView;
};

type SubmissionPipelineFilterInput = Partial<
  Record<keyof SubmissionPipelineFilters, string | null | undefined>
>;

const EMPTY_SUBMISSION_PIPELINE_FILTERS: SubmissionPipelineFilters = {
  candidateId: "",
  clientId: "",
  jobId: "",
  owner: "",
  q: "",
  risk: "",
  stage: "",
  submissionCreated: "",
  submissionId: "",
  view: "board",
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

const normalizeViewValue = (value: string | null | undefined) =>
  value === "list" ? "list" : "board";

const normalizeRiskValue = (value: string | null | undefined) => {
  const normalizedValue = normalizeTextValue(value);

  return apiRiskFlagValues.includes(normalizedValue as ApiRiskFlag)
    ? (normalizedValue as ApiRiskFlag)
    : "";
};

const normalizeStageValue = (value: string | null | undefined) => {
  const normalizedValue = normalizeTextValue(value);

  return apiSubmissionStageValues.includes(
    normalizedValue as ApiSubmissionStage,
  )
    ? (normalizedValue as ApiSubmissionStage)
    : "";
};

const normalizeSubmissionCreatedValue = (value: string | null | undefined) =>
  value === "1" ? "1" : "";

export const normalizeSubmissionPipelineFilters = (
  filters: SubmissionPipelineFilterInput,
): SubmissionPipelineFilters => ({
  candidateId: normalizeUuidValue(filters.candidateId),
  clientId: normalizeUuidValue(filters.clientId),
  jobId: normalizeUuidValue(filters.jobId),
  owner: normalizeUuidValue(filters.owner),
  q: normalizeTextValue(filters.q).slice(0, 200),
  risk: normalizeRiskValue(filters.risk),
  stage: normalizeStageValue(filters.stage),
  submissionCreated: normalizeSubmissionCreatedValue(
    filters.submissionCreated,
  ),
  submissionId: normalizeUuidValue(filters.submissionId),
  view: normalizeViewValue(filters.view),
});

export const parseSubmissionPipelineFiltersFromRecord = (
  params: SearchParamRecord,
) =>
  normalizeSubmissionPipelineFilters({
    candidateId: getSingleRecordValue(params.candidateId),
    clientId: getSingleRecordValue(params.clientId),
    jobId: getSingleRecordValue(params.jobId),
    owner: getSingleRecordValue(params.owner),
    q: getSingleRecordValue(params.q ?? params.search),
    risk: getSingleRecordValue(params.risk ?? params.riskFlag),
    stage: getSingleRecordValue(params.stage),
    submissionCreated: getSingleRecordValue(params.submissionCreated),
    submissionId: getSingleRecordValue(params.submissionId),
    view: getSingleRecordValue(params.view),
  });

export const parseSubmissionPipelineFiltersFromSearchParams = (
  params: SearchParamReader,
) =>
  normalizeSubmissionPipelineFilters({
    candidateId: params.get("candidateId"),
    clientId: params.get("clientId"),
    jobId: params.get("jobId"),
    owner: params.get("owner"),
    q: params.get("q") ?? params.get("search"),
    risk: params.get("risk") ?? params.get("riskFlag"),
    stage: params.get("stage"),
    submissionCreated: params.get("submissionCreated"),
    submissionId: params.get("submissionId"),
    view: params.get("view"),
  });

export const submissionPipelineFiltersToSearchParams = (
  filters: SubmissionPipelineFilters,
  options: {
    includePageSize?: boolean;
    target?: "api" | "url";
  } = {},
) => {
  const normalizedFilters = normalizeSubmissionPipelineFilters(filters);
  const params = new URLSearchParams();
  const target = options.target ?? "url";

  if (target === "url") {
    params.set("view", normalizedFilters.view);
  }

  if (normalizedFilters.q) params.set("q", normalizedFilters.q);
  if (normalizedFilters.jobId) params.set("jobId", normalizedFilters.jobId);
  if (normalizedFilters.candidateId) {
    params.set("candidateId", normalizedFilters.candidateId);
  }
  if (normalizedFilters.clientId) {
    params.set("clientId", normalizedFilters.clientId);
  }
  if (normalizedFilters.owner) params.set("owner", normalizedFilters.owner);
  if (normalizedFilters.stage) params.set("stage", normalizedFilters.stage);

  if (target === "url") {
    if (normalizedFilters.risk) {
      params.set("risk", normalizedFilters.risk);
    }

    if (normalizedFilters.submissionCreated) {
      params.set("submissionCreated", normalizedFilters.submissionCreated);
    }

    if (normalizedFilters.submissionId) {
      params.set("submissionId", normalizedFilters.submissionId);
    }
  } else {
    if (normalizedFilters.risk) {
      params.set("riskFlag", normalizedFilters.risk);
    }

    if (options.includePageSize) {
      params.set("pageSize", "100");
    }
  }

  return params;
};

export const areSubmissionPipelineFiltersEqual = (
  first: SubmissionPipelineFilters,
  second: SubmissionPipelineFilters,
) =>
  first.candidateId === second.candidateId &&
  first.clientId === second.clientId &&
  first.jobId === second.jobId &&
  first.owner === second.owner &&
  first.q === second.q &&
  first.risk === second.risk &&
  first.stage === second.stage &&
  first.submissionCreated === second.submissionCreated &&
  first.submissionId === second.submissionId &&
  first.view === second.view;

export { EMPTY_SUBMISSION_PIPELINE_FILTERS };
