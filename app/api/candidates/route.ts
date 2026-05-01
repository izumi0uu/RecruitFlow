import type { NextRequest } from "next/server";

import type {
  CandidateMutationResponse,
  CandidatesListResponse,
} from "@recruitflow/contracts";

import { isApiRequestError, requestApiJson } from "@/lib/api/client";

export const GET = async (request: NextRequest) => {
  const queryString = request.nextUrl.searchParams.toString();

  try {
    const candidates = await requestApiJson<CandidatesListResponse>(
      `/candidates${queryString ? `?${queryString}` : ""}`,
    );

    return Response.json(candidates);
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

export const POST = async (request: NextRequest) => {
  try {
    const payload = await request.json();
    const candidate = await requestApiJson<CandidateMutationResponse>(
      "/candidates",
      {
        method: "POST",
        json: payload,
      },
    );

    return Response.json(candidate, { status: 201 });
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
