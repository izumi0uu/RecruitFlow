import type { NextRequest } from "next/server";

import type { MemberRemovalResponse } from "@recruitflow/contracts";

import { withBffApiErrorResponse } from "@/lib/api/bff";
import { requestApiJson } from "@/lib/api/client";

type RouteContext = {
  params: Promise<{
    memberId: string;
  }>;
};

export const DELETE = (
  _request: NextRequest,
  { params }: RouteContext,
) =>
  withBffApiErrorResponse(async () => {
    const { memberId } = await params;
    const removal = await requestApiJson<MemberRemovalResponse>(
      `/members/${memberId}`,
      {
        method: "DELETE",
      },
    );

    return Response.json(removal);
  });
