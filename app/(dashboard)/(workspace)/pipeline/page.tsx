import {
  type ApiRiskFlag,
  type ApiSubmissionStage,
  apiDefaultJobStageTemplate,
  apiRiskFlagValues,
  apiSubmissionStageValues,
  type SubmissionsListResponse,
} from "@recruitflow/contracts";
import { redirect } from "next/navigation";

import { isApiRequestError, requestApiJson } from "@/lib/api/client";

import {
  type PipelineActiveFilter,
  PipelineSurface,
  type PipelineView,
} from "./components/PipelineSurface";

type SearchParamsRecord = Record<string, string | string[] | undefined>;

type PageProps = {
  searchParams?: Promise<SearchParamsRecord> | SearchParamsRecord;
};

type PipelineFilterKey =
  | "candidateId"
  | "clientId"
  | "jobId"
  | "owner"
  | "q"
  | "risk"
  | "stage";

const pipelineFilterKeys: PipelineFilterKey[] = [
  "jobId",
  "candidateId",
  "clientId",
  "owner",
  "stage",
  "risk",
  "q",
];

const stageLabelMap = Object.fromEntries(
  apiDefaultJobStageTemplate.map((stage) => [stage.key, stage.label]),
) as Record<ApiSubmissionStage, string>;

const riskLabelMap: Record<ApiRiskFlag, string> = {
  compensation_risk: "Compensation risk",
  feedback_risk: "Feedback risk",
  fit_risk: "Fit risk",
  none: "Clear",
  timing_risk: "Timing risk",
};

const getSingleParamValue = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

const getParam = (params: SearchParamsRecord, key: string) => {
  const value = getSingleParamValue(params[key]);

  return value?.trim() || "";
};

const isUuid = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );

const getUuidParam = (params: SearchParamsRecord, key: string) => {
  const value = getParam(params, key);

  return value && isUuid(value) ? value : "";
};

const isSubmissionStage = (value: string): value is ApiSubmissionStage =>
  apiSubmissionStageValues.includes(value as ApiSubmissionStage);

const isRiskFlag = (value: string): value is ApiRiskFlag =>
  apiRiskFlagValues.includes(value as ApiRiskFlag);

const parsePipelineView = (params: SearchParamsRecord): PipelineView =>
  getParam(params, "view") === "list" ? "list" : "board";

const getRiskParam = (params: SearchParamsRecord) => {
  const canonicalRisk = getParam(params, "risk");

  return canonicalRisk || getParam(params, "riskFlag");
};

const formatOpaqueFilter = (value: string) =>
  value.length > 8 ? `${value.slice(0, 8)}...` : value;

const getOverrideValue = <TKey extends string>(
  overrides: Partial<Record<TKey, string | null>>,
  key: TKey,
  fallback: string,
) => (Object.hasOwn(overrides, key) ? (overrides[key] ?? "") : fallback);

const buildPipelineHref = (
  params: SearchParamsRecord,
  overrides: Partial<
    Record<PipelineFilterKey | "submissionCreated" | "view", string | null>
  >,
) => {
  const query = new URLSearchParams();
  const view = getOverrideValue(overrides, "view", getParam(params, "view"));
  const submissionCreated = getOverrideValue(
    overrides,
    "submissionCreated",
    getParam(params, "submissionCreated"),
  );
  const risk = getOverrideValue(overrides, "risk", getRiskParam(params));

  if (view) {
    query.set("view", view);
  }

  for (const key of pipelineFilterKeys) {
    if (key === "risk") {
      if (risk && isRiskFlag(risk)) {
        query.set("risk", risk);
      }
      continue;
    }

    const overrideValue = overrides[key];
    const value =
      overrideValue === undefined ? getParam(params, key) : overrideValue;

    if (key === "stage" && value && !isSubmissionStage(value)) {
      continue;
    }

    if (
      (key === "candidateId" ||
        key === "clientId" ||
        key === "jobId" ||
        key === "owner") &&
      value &&
      !isUuid(value)
    ) {
      continue;
    }

    if (value) {
      query.set(key, value);
    }
  }

  if (submissionCreated) {
    query.set("submissionCreated", submissionCreated);
  }

  const queryString = query.toString();

  return `/pipeline${queryString ? `?${queryString}` : ""}`;
};

const buildSubmissionsApiPath = (params: SearchParamsRecord) => {
  const query = new URLSearchParams({
    pageSize: "100",
  });
  const q = getParam(params, "q");
  const jobId = getUuidParam(params, "jobId");
  const candidateId = getUuidParam(params, "candidateId");
  const clientId = getUuidParam(params, "clientId");
  const owner = getUuidParam(params, "owner");
  const stage = getParam(params, "stage");
  const risk = getRiskParam(params);

  if (q) {
    query.set("q", q);
  }

  if (jobId) {
    query.set("jobId", jobId);
  }

  if (candidateId) {
    query.set("candidateId", candidateId);
  }

  if (clientId) {
    query.set("clientId", clientId);
  }

  if (owner) {
    query.set("owner", owner);
  }

  if (stage && isSubmissionStage(stage)) {
    query.set("stage", stage);
  }

  if (risk && isRiskFlag(risk)) {
    query.set("riskFlag", risk);
  }

  return `/submissions?${query.toString()}`;
};

const getSubmissionsList = async (params: SearchParamsRecord) => {
  try {
    return await requestApiJson<SubmissionsListResponse>(
      buildSubmissionsApiPath(params),
    );
  } catch (error) {
    if (isApiRequestError(error) && error.status === 401) {
      redirect("/sign-in");
    }

    throw error;
  }
};

const buildActiveFilters = (
  params: SearchParamsRecord,
  submissions: SubmissionsListResponse,
): PipelineActiveFilter[] => {
  const filters: PipelineActiveFilter[] = [];
  const jobId = getUuidParam(params, "jobId");
  const candidateId = getUuidParam(params, "candidateId");
  const clientId = getUuidParam(params, "clientId");
  const owner = getUuidParam(params, "owner");
  const stage = getParam(params, "stage");
  const risk = getRiskParam(params);
  const q = getParam(params, "q");

  if (jobId) {
    const jobSubmission = submissions.items.find(
      (submission) => submission.jobId === jobId,
    );

    filters.push({
      label: "Job",
      value: jobSubmission?.job?.title ?? formatOpaqueFilter(jobId),
    });
  }

  if (candidateId) {
    const candidateSubmission = submissions.items.find(
      (submission) => submission.candidateId === candidateId,
    );

    filters.push({
      label: "Candidate",
      value:
        candidateSubmission?.candidate?.fullName ??
        formatOpaqueFilter(candidateId),
    });
  }

  if (clientId) {
    const clientSubmission = submissions.items.find(
      (submission) => submission.job?.client?.id === clientId,
    );

    filters.push({
      label: "Client",
      value:
        clientSubmission?.job?.client?.name ?? formatOpaqueFilter(clientId),
    });
  }

  if (owner) {
    const ownerOption = submissions.ownerOptions.find(
      (option) => option.id === owner,
    );

    filters.push({
      label: "Owner",
      value:
        ownerOption?.name ?? ownerOption?.email ?? formatOpaqueFilter(owner),
    });
  }

  if (stage && isSubmissionStage(stage)) {
    filters.push({ label: "Stage", value: stageLabelMap[stage] });
  }

  if (risk && isRiskFlag(risk)) {
    filters.push({ label: "Risk", value: riskLabelMap[risk] });
  }

  if (q) {
    filters.push({ label: "Search", value: q });
  }

  return filters;
};

const buildPipelineFilterValues = (params: SearchParamsRecord) => {
  const stage = getParam(params, "stage");
  const risk = getRiskParam(params);

  return {
    candidateId: getUuidParam(params, "candidateId"),
    clientId: getUuidParam(params, "clientId"),
    jobId: getUuidParam(params, "jobId"),
    owner: getUuidParam(params, "owner"),
    q: getParam(params, "q"),
    risk: risk && isRiskFlag(risk) ? risk : "",
    stage: stage && isSubmissionStage(stage) ? stage : "",
  };
};

const PipelinePage = async ({ searchParams }: PageProps) => {
  const params = await Promise.resolve(searchParams ?? {});
  const view = parsePipelineView(params);
  const submissions = await getSubmissionsList(params);
  const activeFilters = buildActiveFilters(params, submissions);
  const filterValues = buildPipelineFilterValues(params);

  return (
    <PipelineSurface
      activeFilters={activeFilters}
      boardHref={buildPipelineHref(params, { view: "board" })}
      filterValues={filterValues}
      listHref={buildPipelineHref(params, { view: "list" })}
      resetHref={buildPipelineHref(params, {
        candidateId: null,
        clientId: null,
        jobId: null,
        owner: null,
        q: null,
        risk: null,
        stage: null,
        submissionCreated: null,
        view,
      })}
      submissionCreated={getParam(params, "submissionCreated") === "1"}
      submissions={submissions}
      view={view}
    />
  );
};

export default PipelinePage;
