import type { NextRequest } from "next/server";

import type { ClientsListResponse } from "@recruitflow/contracts";

import { isApiRequestError, requestApiJson } from "@/lib/api/client";

export const GET = async (request: NextRequest) => {
  const queryString = request.nextUrl.searchParams.toString();

  try {
    const clients = await requestApiJson<ClientsListResponse>(
      `/clients${queryString ? `?${queryString}` : ""}`,
    );

    return Response.json(clients);
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
