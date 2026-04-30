import type { ClientRestoreResponse } from "@recruitflow/contracts";

import { isApiRequestError, requestApiJson } from "@/lib/api/client";

type RouteContext = {
  params: Promise<{
    clientId: string;
  }>;
};

export const PATCH = async (_request: Request, { params }: RouteContext) => {
  const { clientId } = await params;

  try {
    const client = await requestApiJson<ClientRestoreResponse>(
      `/clients/${clientId}/restore`,
      {
        method: "PATCH",
      },
    );

    return Response.json(client);
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
