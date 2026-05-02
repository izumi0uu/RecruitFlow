import type { NextRequest } from "next/server";

import type {
  CandidateDetailResponse,
  CandidateMutationResponse,
} from "@recruitflow/contracts";

import { withBffApiErrorResponse } from "@/lib/api/bff";
import { requestApiJson } from "@/lib/api/client";

type RouteContext = {
  params: Promise<{
    candidateId: string;
  }>;
};

export const GET = (_request: NextRequest, context: RouteContext) =>
  withBffApiErrorResponse(async () => {
    const { candidateId } = await context.params;
    const candidate = await requestApiJson<CandidateDetailResponse>(
      `/candidates/${candidateId}`,
    );

    return Response.json(candidate);
  });

export const PATCH = (request: NextRequest, context: RouteContext) =>
  withBffApiErrorResponse(async () => {
    const { candidateId } = await context.params;
    const payload = await request.json();
    const candidate = await requestApiJson<CandidateMutationResponse>(
      `/candidates/${candidateId}`,
      {
        method: "PATCH",
        json: payload,
      },
    );

    return Response.json(candidate);
  });
