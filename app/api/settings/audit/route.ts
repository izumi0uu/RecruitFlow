import type { SettingsAuditListResponse } from "@recruitflow/contracts";
import type { NextRequest } from "next/server";

import { withBffApiErrorResponse } from "@/lib/api/bff";
import { requestApiJson } from "@/lib/api/client";

export const GET = (request: NextRequest) =>
  withBffApiErrorResponse(async () => {
    const queryString = request.nextUrl.searchParams.toString();
    const audit = await requestApiJson<SettingsAuditListResponse>(
      `/audit/logs${queryString ? `?${queryString}` : ""}`,
    );

    return Response.json(audit);
  });
