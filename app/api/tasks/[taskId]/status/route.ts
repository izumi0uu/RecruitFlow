import type { TaskMutationResponse } from "@recruitflow/contracts";
import type { NextRequest } from "next/server";

import { withBffApiErrorResponse } from "@/lib/api/bff";
import { requestApiJson } from "@/lib/api/client";

type RouteContext = {
  params: Promise<{ taskId: string }> | { taskId: string };
};

export const PATCH = (request: NextRequest, context: RouteContext) =>
  withBffApiErrorResponse(async () => {
    const [{ taskId }, payload] = await Promise.all([
      Promise.resolve(context.params),
      request.json(),
    ]);
    const task = await requestApiJson<TaskMutationResponse>(
      `/tasks/${taskId}/status`,
      {
        method: "PATCH",
        json: payload,
      },
    );

    return Response.json(task);
  });
