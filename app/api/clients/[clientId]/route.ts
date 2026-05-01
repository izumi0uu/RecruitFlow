import type { NextRequest } from "next/server";

import type { ClientMutationResponse } from "@recruitflow/contracts";

import { withBffApiErrorResponse } from "@/lib/api/bff";
import { requestApiJson } from "@/lib/api/client";

type RouteContext = {
  params: Promise<{
    clientId: string;
  }>;
};

export const PATCH = (
  request: NextRequest,
  { params }: RouteContext,
) =>
  withBffApiErrorResponse(async () => {
    const { clientId } = await params;
    const payload = await request.json();
    const client = await requestApiJson<ClientMutationResponse>(
      `/clients/${clientId}`,
      {
        method: "PATCH",
        json: payload,
      },
    );

    return Response.json(client);
  });
