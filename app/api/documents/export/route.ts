import type { NextRequest } from "next/server";

import { relayApiResponse } from "@/lib/api/bff";
import { requestApiResponse } from "@/lib/api/client";

export const GET = async (request: NextRequest) => {
  const queryString = request.nextUrl.searchParams.toString();
  const response = await requestApiResponse(
    `/documents/export${queryString ? `?${queryString}` : ""}`,
  );

  return relayApiResponse(response);
};
