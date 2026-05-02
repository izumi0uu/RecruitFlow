import type { NextRequest } from "next/server";

import type {
  JobMutationResponse,
  JobsListResponse,
} from "@recruitflow/contracts";

import { withBffApiErrorResponse } from "@/lib/api/bff";
import { requestApiJson } from "@/lib/api/client";

export const GET = (request: NextRequest) =>
  withBffApiErrorResponse(async () => {
    const queryString = request.nextUrl.searchParams.toString();
    const jobs = await requestApiJson<JobsListResponse>(
      `/jobs${queryString ? `?${queryString}` : ""}`,
    );

    return Response.json(jobs);
  });

export const POST = (request: NextRequest) =>
  withBffApiErrorResponse(async () => {
    const payload = await request.json();
    const job = await requestApiJson<JobMutationResponse>("/jobs", {
      method: "POST",
      json: payload,
    });

    return Response.json(job, { status: 201 });
  });
