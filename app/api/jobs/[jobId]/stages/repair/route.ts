import type {
  JobStageRepairResponse,
} from "@recruitflow/contracts";

import { withBffApiErrorResponse } from "@/lib/api/bff";
import { requestApiJson } from "@/lib/api/client";

type RouteContext = {
  params: Promise<{
    jobId: string;
  }>;
};

export const POST = (_request: Request, context: RouteContext) =>
  withBffApiErrorResponse(async () => {
    const { jobId } = await context.params;
    const repair = await requestApiJson<JobStageRepairResponse>(
      `/jobs/${jobId}/stages/repair`,
      {
        method: "POST",
      },
    );

    return Response.json(repair);
  });
