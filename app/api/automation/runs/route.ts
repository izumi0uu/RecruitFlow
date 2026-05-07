import type { AutomationRunMutationResponse } from "@recruitflow/contracts";
import type { NextRequest } from "next/server";

import { withBffApiErrorResponse } from "@/lib/api/bff";
import { requestApiJson } from "@/lib/api/client";

export const POST = (request: NextRequest) =>
  withBffApiErrorResponse(async () => {
    const payload = await request.json();
    const automationRun = await requestApiJson<AutomationRunMutationResponse>(
      "/automation/runs",
      {
        method: "POST",
        json: payload,
      },
    );

    return Response.json(automationRun, { status: 201 });
  });
