import { revalidatePath } from "next/cache";

import type { ClientArchiveResponse } from "@recruitflow/contracts";

import { isApiRequestError, requestApiJson } from "@/lib/api/client";

type RouteContext = {
  params: Promise<{
    clientId: string;
  }>;
};

export const PATCH = async (_request: Request, { params }: RouteContext) => {
  const { clientId } = await params;

  try {
    const client = await requestApiJson<ClientArchiveResponse>(
      `/clients/${clientId}/archive`,
      {
        method: "PATCH",
      },
    );

    revalidatePath("/clients");
    revalidatePath(`/clients/${clientId}`);

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
