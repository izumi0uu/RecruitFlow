import type { NextRequest } from "next/server";

import type { ClientMutationResponse } from "@recruitflow/contracts";

import { isApiRequestError, requestApiJson } from "@/lib/api/client";

type RouteContext = {
  params: Promise<{
    clientId: string;
  }>;
};

export const PATCH = async (
  request: NextRequest,
  { params }: RouteContext,
) => {
  const { clientId } = await params;

  try {
    const payload = await request.json();
    const client = await requestApiJson<ClientMutationResponse>(
      `/clients/${clientId}`,
      {
        method: "PATCH",
        json: payload,
      },
    );

    return Response.json(client);
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
