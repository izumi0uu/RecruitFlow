import type { NextRequest } from "next/server";

import type { ClientContactMutationResponse } from "@recruitflow/contracts";

import { withBffApiErrorResponse } from "@/lib/api/bff";
import { requestApiJson } from "@/lib/api/client";

type RouteContext = {
  params: Promise<{
    clientId: string;
    contactId: string;
  }>;
};

export const PATCH = (
  request: NextRequest,
  { params }: RouteContext,
) =>
  withBffApiErrorResponse(async () => {
    const { clientId, contactId } = await params;
    const payload = await request.json();
    const contact = await requestApiJson<ClientContactMutationResponse>(
      `/clients/${clientId}/contacts/${contactId}`,
      {
        method: "PATCH",
        json: payload,
      },
    );

    return Response.json(contact);
  });
