import type { NextRequest } from "next/server";

import type {
  SubmissionMutationResponse,
  SubmissionsListResponse,
} from "@recruitflow/contracts";

import { withBffApiErrorResponse } from "@/lib/api/bff";
import { requestApiJson } from "@/lib/api/client";

export const GET = (request: NextRequest) =>
  withBffApiErrorResponse(async () => {
    const queryString = request.nextUrl.searchParams.toString();
    const submissions = await requestApiJson<SubmissionsListResponse>(
      `/submissions${queryString ? `?${queryString}` : ""}`,
    );

    return Response.json(submissions);
  });

export const POST = (request: NextRequest) =>
  withBffApiErrorResponse(async () => {
    const payload = await request.json();
    const submission = await requestApiJson<SubmissionMutationResponse>(
      "/submissions",
      {
        method: "POST",
        json: payload,
      },
    );

    return Response.json(submission, { status: 201 });
  });
