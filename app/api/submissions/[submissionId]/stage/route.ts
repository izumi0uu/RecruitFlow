import type { SubmissionMutationResponse } from "@recruitflow/contracts";
import type { NextRequest } from "next/server";

import { withBffApiErrorResponse } from "@/lib/api/bff";
import { requestApiJson } from "@/lib/api/client";

type RouteContext = {
  params: Promise<{
    submissionId: string;
  }>;
};

export const PATCH = (request: NextRequest, context: RouteContext) =>
  withBffApiErrorResponse(async () => {
    const { submissionId } = await context.params;
    const payload = await request.json();
    const submission = await requestApiJson<SubmissionMutationResponse>(
      `/submissions/${submissionId}/stage`,
      {
        method: "PATCH",
        json: payload,
      },
    );

    return Response.json(submission);
  });
