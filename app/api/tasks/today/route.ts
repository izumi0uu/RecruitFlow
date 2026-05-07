import type { FollowUpTodayResponse } from "@recruitflow/contracts";
import type { NextRequest } from "next/server";

import { withBffApiErrorResponse } from "@/lib/api/bff";
import { requestApiJson } from "@/lib/api/client";

export const GET = (request: NextRequest) =>
  withBffApiErrorResponse(async () => {
    const queryString = request.nextUrl.searchParams.toString();
    const followUps = await requestApiJson<FollowUpTodayResponse>(
      `/tasks/today${queryString ? `?${queryString}` : ""}`,
    );

    return Response.json(followUps);
  });
