import type { NextRequest } from "next/server";

import type {
  CandidateDetailResponse,
  CandidateMutationResponse,
} from "@recruitflow/contracts";

import { isApiRequestError, requestApiJson } from "@/lib/api/client";

type RouteContext = {
  params: Promise<{
    candidateId: string;
  }>;
};

export const GET = async (_request: NextRequest, context: RouteContext) => {
  const { candidateId } = await context.params;

  try {
    const candidate = await requestApiJson<CandidateDetailResponse>(
      `/candidates/${candidateId}`,
    );

    return Response.json(candidate);
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
  const { candidateId } = await context.params;

  try {
    const payload = await request.json();
    const candidate = await requestApiJson<CandidateMutationResponse>(
      `/candidates/${candidateId}`,
      {
        method: "PATCH",
        json: payload,
      },
    );

    return Response.json(candidate);
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
