import type { NextRequest } from "next/server";

import type {
  JobDetailResponse,
  JobMutationResponse,
} from "@recruitflow/contracts";

import { withBffApiErrorResponse } from "@/lib/api/bff";
import { requestApiJson } from "@/lib/api/client";

type RouteContext = {
  params: Promise<{
    jobId: string;
  }>;
};

export const GET = (_request: NextRequest, context: RouteContext) =>
  withBffApiErrorResponse(async () => {
    const { jobId } = await context.params;
    const job = await requestApiJson<JobDetailResponse>(`/jobs/${jobId}`);

    return Response.json(job);
  });

export const PATCH = (request: NextRequest, context: RouteContext) =>
  withBffApiErrorResponse(async () => {
    const { jobId } = await context.params;
    const payload = await request.json();
    const job = await requestApiJson<JobMutationResponse>(`/jobs/${jobId}`, {
      method: "PATCH",
      json: payload,
    });

    return Response.json(job);
  });
