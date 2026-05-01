import type { NextRequest } from "next/server";

import type {
  ClientMutationResponse,
  ClientsListResponse,
} from "@recruitflow/contracts";

import { withBffApiErrorResponse } from "@/lib/api/bff";
import { requestApiJson } from "@/lib/api/client";

export const GET = (request: NextRequest) =>
  withBffApiErrorResponse(async () => {
    const queryString = request.nextUrl.searchParams.toString();
    const clients = await requestApiJson<ClientsListResponse>(
      `/clients${queryString ? `?${queryString}` : ""}`,
    );

    return Response.json(clients);
  });

export const POST = (request: NextRequest) =>
  withBffApiErrorResponse(async () => {
    const payload = await request.json();
    const client = await requestApiJson<ClientMutationResponse>("/clients", {
      method: "POST",
      json: payload,
    });

    return Response.json(client, { status: 201 });
  });
