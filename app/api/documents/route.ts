import type { NextRequest } from "next/server";

import type {
  DocumentMutationResponse,
  DocumentsListResponse,
} from "@recruitflow/contracts";

import { withBffApiErrorResponse } from "@/lib/api/bff";
import { requestApiJson } from "@/lib/api/client";

export const GET = (request: NextRequest) =>
  withBffApiErrorResponse(async () => {
    const queryString = request.nextUrl.searchParams.toString();
    const documents = await requestApiJson<DocumentsListResponse>(
      `/documents${queryString ? `?${queryString}` : ""}`,
    );

    return Response.json(documents);
  });

export const POST = (request: NextRequest) =>
  withBffApiErrorResponse(async () => {
    const payload = await request.json();
    const document = await requestApiJson<DocumentMutationResponse>(
      "/documents",
      {
        method: "POST",
        json: payload,
      },
    );

    return Response.json(document, { status: 201 });
  });
