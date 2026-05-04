import type {
  CurrentWorkspaceResponse,
  WorkspaceProfileUpdateResponse,
} from "@recruitflow/contracts";

import { withBffApiErrorResponse } from "@/lib/api/bff";
import { requestApiJson } from "@/lib/api/client";

export const GET = () =>
  withBffApiErrorResponse(async () => {
    const workspace =
      await requestApiJson<CurrentWorkspaceResponse>("/workspaces/current");

    return Response.json(workspace);
  });

export const PATCH = (request: Request) =>
  withBffApiErrorResponse(async () => {
    const payload = await request.json();
    const workspace = await requestApiJson<WorkspaceProfileUpdateResponse>(
      "/workspaces/current",
      {
        method: "PATCH",
        json: payload,
      },
    );

    return Response.json(workspace);
  });
