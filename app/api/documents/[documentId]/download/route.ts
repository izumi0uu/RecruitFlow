import type { NextRequest } from "next/server";

import { relayApiResponse } from "@/lib/api/bff";
import { requestApiResponse } from "@/lib/api/client";

type RouteContext = {
  params: Promise<{
    documentId: string;
  }>;
};

export const GET = async (request: NextRequest, { params }: RouteContext) => {
  const { documentId } = await params;
  const queryString = request.nextUrl.searchParams.toString();
  const response = await requestApiResponse(
    `/documents/${documentId}/download${queryString ? `?${queryString}` : ""}`,
  );

  return relayApiResponse(response);
};
