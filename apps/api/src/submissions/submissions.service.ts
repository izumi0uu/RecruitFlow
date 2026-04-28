import { Injectable } from "@nestjs/common";

import {
  createCrmModulePlaceholderResponse,
  type SubmissionsListQuery,
  type SubmissionsModulePlaceholderResponse,
} from "@recruitflow/contracts";

import type { ApiWorkspaceContext } from "../workspace/workspace.service";

const reservedRoutes = [
  {
    method: "GET",
    path: "/submissions",
    purpose: "Workspace-scoped submission pipeline query surface",
  },
  {
    method: "POST",
    path: "/submissions",
    purpose: "Future candidate-to-job submission creation entry point",
  },
  {
    method: "GET",
    path: "/submissions/:submissionId",
    purpose: "Future submission detail query surface",
  },
  {
    method: "PATCH",
    path: "/submissions/:submissionId/stage",
    purpose: "Future stage transition mutation surface",
  },
] as const;

@Injectable()
export class SubmissionsService {
  getModulePlaceholder(
    context: ApiWorkspaceContext,
    query: SubmissionsListQuery,
  ): SubmissionsModulePlaceholderResponse {
    return createCrmModulePlaceholderResponse({
      context: {
        role: context.membership.role,
        workspaceId: context.workspace.id,
      },
      domain: "submissions",
      implementationStory:
        "RF-40 | RF-050 Create Submission Query Layer and Create Flow",
      message:
        "Submissions transport now has a reserved Nest module and shared query contract so the pipeline branch can take over list, detail, create, and stage-move flows on a stable API boundary.",
      ownerBranch: "feature-submission-pipeline",
      query,
      reservedRoutes: [...reservedRoutes],
    });
  }
}
