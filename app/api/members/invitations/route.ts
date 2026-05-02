import type { NextRequest } from "next/server";

import type { MemberInvitationResponse } from "@recruitflow/contracts";

import { withBffApiErrorResponse } from "@/lib/api/bff";
import { requestApiJson } from "@/lib/api/client";

export const POST = (request: NextRequest) =>
  withBffApiErrorResponse(async () => {
    const payload = await request.json();
    const invitation = await requestApiJson<MemberInvitationResponse>(
      "/members/invitations",
      {
        method: "POST",
        json: payload,
      },
    );

    return Response.json(invitation, { status: 201 });
  });
