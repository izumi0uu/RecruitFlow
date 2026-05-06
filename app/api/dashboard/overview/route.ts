import type { ApiDashboardOverviewResponse } from "@recruitflow/contracts";

import { withBffApiErrorResponse } from "@/lib/api/bff";
import { requestApiJson } from "@/lib/api/client";

export const GET = () =>
  withBffApiErrorResponse(async () => {
    const dashboard = await requestApiJson<ApiDashboardOverviewResponse>(
      "/dashboard/overview",
    );

    return Response.json(dashboard);
  });
