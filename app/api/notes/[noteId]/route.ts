import type { NoteDeleteResponse } from "@recruitflow/contracts";
import type { NextRequest } from "next/server";

import { withBffApiErrorResponse } from "@/lib/api/bff";
import { requestApiJson } from "@/lib/api/client";

type NoteRouteContext = {
  params: Promise<{
    noteId: string;
  }>;
};

export const DELETE = (_request: NextRequest, context: NoteRouteContext) =>
  withBffApiErrorResponse(async () => {
    const { noteId } = await context.params;
    const response = await requestApiJson<NoteDeleteResponse>(
      `/notes/${noteId}`,
      {
        method: "DELETE",
      },
    );

    return Response.json(response);
  });
