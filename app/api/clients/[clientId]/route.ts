import type { NextRequest } from "next/server";

import type {
  ClientDetailResponse,
  ClientMutationResponse,
} from "@recruitflow/contracts";

import { withBffApiErrorResponse } from "@/lib/api/bff";
import { requestApiJson } from "@/lib/api/client";

type RouteContext = {
  params: Promise<{
    clientId: string;
  }>;
};

export const GET = (_request: NextRequest, { params }: RouteContext) =>
  withBffApiErrorResponse(async () => {
    const { clientId } = await params;
    const client = await requestApiJson<ClientDetailResponse>(
      `/clients/${clientId}`,
    );

    return Response.json(client);
  });

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
