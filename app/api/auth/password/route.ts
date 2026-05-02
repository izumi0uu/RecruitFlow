import type { NextRequest } from "next/server";

import type { AuthPasswordUpdateResponse } from "@recruitflow/contracts";

import { withBffApiErrorResponse } from "@/lib/api/bff";
import { requestApiJson } from "@/lib/api/client";

export const PATCH = (request: NextRequest) =>
  withBffApiErrorResponse(async () => {
    const payload = await request.json();
    const password = await requestApiJson<AuthPasswordUpdateResponse>(
      "/auth/password",
      {
        method: "PATCH",
        json: payload,
      },
    );

    return Response.json(password);
  });
