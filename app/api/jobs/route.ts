import type { NextRequest } from "next/server";

import type { JobsListResponse } from "@recruitflow/contracts";

import { isApiRequestError, requestApiJson } from "@/lib/api/client";

export const GET = async (request: NextRequest) => {
  const queryString = request.nextUrl.searchParams.toString();

  try {
    const jobs = await requestApiJson<JobsListResponse>(
      `/jobs${queryString ? `?${queryString}` : ""}`,
    );

    return Response.json(jobs);
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
