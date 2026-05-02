import type { NextRequest } from "next/server";

import type { AuthAccountUpdateResponse } from "@recruitflow/contracts";

import { withBffApiErrorResponse } from "@/lib/api/bff";
import { requestApiJson } from "@/lib/api/client";

export const PATCH = (request: NextRequest) =>
  withBffApiErrorResponse(async () => {
    const payload = await request.json();
    const account = await requestApiJson<AuthAccountUpdateResponse>(
      "/auth/account",
      {
        method: "PATCH",
        json: payload,
      },
    );

    return Response.json(account);
  });
