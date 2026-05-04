import type { ActivityTimelineResponse } from "@recruitflow/contracts";
import type { NextRequest } from "next/server";

import { withBffApiErrorResponse } from "@/lib/api/bff";
import { requestApiJson } from "@/lib/api/client";

export const GET = (request: NextRequest) =>
  withBffApiErrorResponse(async () => {
    const queryString = request.nextUrl.searchParams.toString();
    const timeline = await requestApiJson<ActivityTimelineResponse>(
      `/activity/timeline${queryString ? `?${queryString}` : ""}`,
    );

    return Response.json(timeline);
  });
