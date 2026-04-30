import type { NextRequest } from "next/server";

import type { ClientContactMutationResponse } from "@recruitflow/contracts";

import { isApiRequestError, requestApiJson } from "@/lib/api/client";

type RouteContext = {
  params: Promise<{
    clientId: string;
  }>;
};

export const POST = async (
  request: NextRequest,
  { params }: RouteContext,
) => {
  const { clientId } = await params;

  try {
    const payload = await request.json();
    const contact = await requestApiJson<ClientContactMutationResponse>(
      `/clients/${clientId}/contacts`,
      {
        method: "POST",
        json: payload,
      },
    );

    return Response.json(contact, { status: 201 });
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
