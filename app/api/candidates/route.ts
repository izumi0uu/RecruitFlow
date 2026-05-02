import type { NextRequest } from "next/server";

import type {
  CandidateMutationResponse,
  CandidatesListResponse,
} from "@recruitflow/contracts";

import { withBffApiErrorResponse } from "@/lib/api/bff";
import { requestApiJson } from "@/lib/api/client";

export const GET = (request: NextRequest) =>
  withBffApiErrorResponse(async () => {
    const queryString = request.nextUrl.searchParams.toString();
    const candidates = await requestApiJson<CandidatesListResponse>(
      `/candidates${queryString ? `?${queryString}` : ""}`,
    );

    return Response.json(candidates);
  });

export const POST = (request: NextRequest) =>
  withBffApiErrorResponse(async () => {
    const payload = await request.json();
    const candidate = await requestApiJson<CandidateMutationResponse>(
      "/candidates",
      {
        method: "POST",
        json: payload,
      },
    );

    return Response.json(candidate, { status: 201 });
  });
