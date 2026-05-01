import { revalidatePath } from "next/cache";

import type { ClientRestoreResponse } from "@recruitflow/contracts";

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
    const client = await requestApiJson<ClientRestoreResponse>(
      `/clients/${clientId}/restore`,
      {
        method: "PATCH",
      },
    );

    revalidatePath("/clients");
    revalidatePath(`/clients/${clientId}`);

    return Response.json(client);
  });
