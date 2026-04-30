import type { NextRequest } from "next/server";

import type {
  ClientMutationResponse,
  ClientsListResponse,
} from "@recruitflow/contracts";

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

export const POST = async (request: NextRequest) => {
  try {
    const payload = await request.json();
    const client = await requestApiJson<ClientMutationResponse>("/clients", {
      method: "POST",
      json: payload,
    });

    return Response.json(client, { status: 201 });
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
