import type { AutomationRunMutationResponse } from "@recruitflow/contracts";
import type { NextRequest } from "next/server";

import { withBffApiErrorResponse } from "@/lib/api/bff";
import { requestApiJson } from "@/lib/api/client";

type RouteContext = {
  params:
    | Promise<{
        automationRunId: string;
      }>
    | {
        automationRunId: string;
      };
};

export const POST = (_request: NextRequest, context: RouteContext) =>
  withBffApiErrorResponse(async () => {
    const { automationRunId } = await Promise.resolve(context.params);
    const automationRun = await requestApiJson<AutomationRunMutationResponse>(
      `/automation/runs/${automationRunId}/retry`,
      {
        method: "POST",
      },
    );

    return Response.json(automationRun);
  });
