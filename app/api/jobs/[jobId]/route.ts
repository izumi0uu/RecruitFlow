import type { NextRequest } from "next/server";

import type {
  JobDetailResponse,
  JobMutationResponse,
} from "@recruitflow/contracts";

import { isApiRequestError, requestApiJson } from "@/lib/api/client";

type RouteContext = {
  params: Promise<{
    jobId: string;
  }>;
};

export const GET = async (_request: NextRequest, context: RouteContext) => {
  const { jobId } = await context.params;

  try {
    const job = await requestApiJson<JobDetailResponse>(`/jobs/${jobId}`);

    return Response.json(job);
  } catch (error) {
    if (isApiRequestError(error)) {
      return Response.json(
        { error: error.message },
        { status: error.status },
      );
    }

    throw error;
  }
};

export const PATCH = async (request: NextRequest, context: RouteContext) => {
  const { jobId } = await context.params;

  try {
    const payload = await request.json();
    const job = await requestApiJson<JobMutationResponse>(`/jobs/${jobId}`, {
      method: "PATCH",
      json: payload,
    });

    return Response.json(job);
  } catch (error) {
    if (isApiRequestError(error)) {
      return Response.json(
        { error: error.message },
        { status: error.status },
      );
    }

    throw error;
  }
};
