import { cache } from "react";

import type {
  ApiDashboardActivityItem,
  ApiDashboardKpis,
  ApiDashboardOutcomeSummary,
  ApiDashboardOverviewResponse,
  ApiDashboardPlacementItem,
  ApiDashboardPulsePoint,
  ApiDashboardRiskSegment,
  ApiDashboardSectionResult,
  ApiDashboardStageDatum,
  ApiDashboardSubmissionDigestItem,
  ApiDashboardTaskDigestItem,
} from "@recruitflow/contracts";

import { requestApiJson } from "@/lib/api/client";

export type DashboardKpis = ApiDashboardKpis;

export type DashboardPulsePoint = ApiDashboardPulsePoint &
  Record<string, number | string>;

export type DashboardStageDatum = ApiDashboardStageDatum;

export type DashboardRiskSegment = ApiDashboardRiskSegment;

export type DashboardSubmissionDigestItem = Omit<
  ApiDashboardSubmissionDigestItem,
  "lastTouchAt"
> & {
  lastTouchAt: Date | null;
};

export type DashboardTaskDigestItem = Omit<
  ApiDashboardTaskDigestItem,
  "dueAt"
> & {
  dueAt: Date | null;
};

export type DashboardPlacementItem = Omit<
  ApiDashboardPlacementItem,
  "placedAt"
> & {
  placedAt: Date;
};

export type DashboardOutcomeSummary = Omit<
  ApiDashboardOutcomeSummary,
  "recentPlacements"
> & {
  recentPlacements: DashboardPlacementItem[];
};

export type DashboardActivityItem = Omit<
  ApiDashboardActivityItem,
  "timestamp"
> & {
  timestamp: Date;
};

type DashboardSectionResult<T> = ApiDashboardSectionResult<T>;

type DashboardOverview = {
  sections: {
    activityDigest: DashboardSectionResult<DashboardActivityItem[]>;
    atRiskSubmissions: DashboardSectionResult<DashboardSubmissionDigestItem[]>;
    kpis: DashboardSectionResult<DashboardKpis>;
    myTasks: DashboardSectionResult<DashboardTaskDigestItem[]>;
    operationalPulse: DashboardSectionResult<DashboardPulsePoint[]>;
    outcomeSummary: DashboardSectionResult<DashboardOutcomeSummary>;
    overdueTasks: DashboardSectionResult<DashboardTaskDigestItem[]>;
    riskBreakdown: DashboardSectionResult<DashboardRiskSegment[]>;
    stageDistribution: DashboardSectionResult<DashboardStageDatum[]>;
    staleSubmissions: DashboardSectionResult<DashboardSubmissionDigestItem[]>;
  };
};

const parseOptionalDate = (value: string | null) =>
  value ? new Date(value) : null;

const mapSection = <Input, Output>(
  section: ApiDashboardSectionResult<Input>,
  mapValue: (value: Input) => Output,
): DashboardSectionResult<Output> => {
  if (section.status === "rejected") {
    return section;
  }

  return {
    status: "fulfilled",
    value: mapValue(section.value),
  };
};

const unwrapSection = <T>(section: DashboardSectionResult<T>) => {
  if (section.status === "fulfilled") {
    return section.value;
  }

  throw new Error(section.message);
};

const mapSubmissionDigestItem = (
  item: ApiDashboardSubmissionDigestItem,
): DashboardSubmissionDigestItem => ({
  ...item,
  lastTouchAt: parseOptionalDate(item.lastTouchAt),
});

const mapTaskDigestItem = (
  item: ApiDashboardTaskDigestItem,
): DashboardTaskDigestItem => ({
  ...item,
  dueAt: parseOptionalDate(item.dueAt),
});

const mapOutcomeSummary = (
  summary: ApiDashboardOutcomeSummary,
): DashboardOutcomeSummary => ({
  ...summary,
  recentPlacements: summary.recentPlacements.map((placement) => ({
    ...placement,
    placedAt: new Date(placement.placedAt),
  })),
});

const mapActivityItem = (
  item: ApiDashboardActivityItem,
): DashboardActivityItem => ({
  ...item,
  timestamp: new Date(item.timestamp),
});

const getDashboardOverview = cache(
  async (_workspaceId: string): Promise<DashboardOverview> => {
    const response = await requestApiJson<ApiDashboardOverviewResponse>(
      "/dashboard/overview",
    );

    return {
      sections: {
        activityDigest: mapSection(response.sections.activityDigest, (items) =>
          items.map(mapActivityItem),
        ),
        atRiskSubmissions: mapSection(
          response.sections.atRiskSubmissions,
          (items) => items.map(mapSubmissionDigestItem),
        ),
        kpis: response.sections.kpis,
        myTasks: mapSection(response.sections.myTasks, (items) =>
          items.map(mapTaskDigestItem),
        ),
        operationalPulse: mapSection(
          response.sections.operationalPulse,
          (points) => points.map((point) => ({ ...point })),
        ),
        outcomeSummary: mapSection(
          response.sections.outcomeSummary,
          mapOutcomeSummary,
        ),
        overdueTasks: mapSection(response.sections.overdueTasks, (items) =>
          items.map(mapTaskDigestItem),
        ),
        riskBreakdown: response.sections.riskBreakdown,
        stageDistribution: response.sections.stageDistribution,
        staleSubmissions: mapSection(
          response.sections.staleSubmissions,
          (items) => items.map(mapSubmissionDigestItem),
        ),
      },
    };
  },
);

export const getDashboardKpis = cache(async (workspaceId: string) => {
  return unwrapSection((await getDashboardOverview(workspaceId)).sections.kpis);
});

export const getDashboardOperationalPulse = cache(
  async (workspaceId: string, days = 7) => {
    const pulse = unwrapSection(
      (await getDashboardOverview(workspaceId)).sections.operationalPulse,
    );

    return pulse.slice(-days);
  },
);

export const getDashboardStageDistribution = cache(
  async (workspaceId: string) => {
    return unwrapSection(
      (await getDashboardOverview(workspaceId)).sections.stageDistribution,
    );
  },
);

export const getDashboardRiskBreakdown = cache(async (workspaceId: string) => {
  return unwrapSection(
    (await getDashboardOverview(workspaceId)).sections.riskBreakdown,
  );
});

export const getDashboardAtRiskSubmissions = cache(
  async (workspaceId: string, limit = 4) => {
    const items = unwrapSection(
      (await getDashboardOverview(workspaceId)).sections.atRiskSubmissions,
    );

    return items.slice(0, limit);
  },
);

export const getDashboardStaleSubmissions = cache(
  async (workspaceId: string, limit = 4) => {
    const items = unwrapSection(
      (await getDashboardOverview(workspaceId)).sections.staleSubmissions,
    );

    return items.slice(0, limit);
  },
);

export const getDashboardOverdueTasks = cache(
  async (workspaceId: string, limit = 4) => {
    const items = unwrapSection(
      (await getDashboardOverview(workspaceId)).sections.overdueTasks,
    );

    return items.slice(0, limit);
  },
);

export const getDashboardUserTasks = cache(
  async (workspaceId: string, _userId: string, limit = 4) => {
    const items = unwrapSection(
      (await getDashboardOverview(workspaceId)).sections.myTasks,
    );

    return items.slice(0, limit);
  },
);

export const getDashboardOutcomeSummary = cache(async (workspaceId: string) => {
  return unwrapSection(
    (await getDashboardOverview(workspaceId)).sections.outcomeSummary,
  );
});

export const getDashboardActivityDigest = cache(
  async (workspaceId: string, limit = 5) => {
    const items = unwrapSection(
      (await getDashboardOverview(workspaceId)).sections.activityDigest,
    );

    return items.slice(0, limit);
  },
);
