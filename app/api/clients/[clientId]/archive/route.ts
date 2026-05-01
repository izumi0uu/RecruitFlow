import type { ClientArchiveResponse } from "@recruitflow/contracts";

import { withBffApiErrorResponse } from "@/lib/api/bff";
import { requestApiJson } from "@/lib/api/client";

type RouteContext = {
  params: Promise<{
    clientId: string;
  }>;
};

export const PATCH = (_request: Request, { params }: RouteContext) =>
  withBffApiErrorResponse(async () => {
    const { clientId } = await params;
    const client = await requestApiJson<ClientArchiveResponse>(
      `/clients/${clientId}/archive`,
      {
        method: "PATCH",
      },
    );

    return Response.json(client);
  });
