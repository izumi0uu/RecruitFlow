import type { NextRequest } from "next/server";

import type {
  DocumentMutationResponse,
  DocumentsListResponse,
} from "@recruitflow/contracts";

import { isApiRequestError, requestApiJson } from "@/lib/api/client";

export const GET = async (request: NextRequest) => {
  const queryString = request.nextUrl.searchParams.toString();

  try {
    const documents = await requestApiJson<DocumentsListResponse>(
      `/documents${queryString ? `?${queryString}` : ""}`,
    );

    return Response.json(documents);
  } catch (error) {
    if (isApiRequestError(error)) {
      return Response.json(
        { error: error.message },
        { status: error.status },
      );
    }

    throw error;
  }
};

export const POST = async (request: NextRequest) => {
  try {
    const payload = await request.json();
    const document = await requestApiJson<DocumentMutationResponse>(
      "/documents",
      {
        method: "POST",
        json: payload,
      },
    );

    return Response.json(document, { status: 201 });
  } catch (error) {
    if (isApiRequestError(error)) {
      return Response.json(
        { error: error.message },
        { status: error.status },
      );
    }

    throw error;
  }
};
