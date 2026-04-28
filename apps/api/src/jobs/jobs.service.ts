import { Injectable } from "@nestjs/common";

import {
  createCrmModulePlaceholderResponse,
  type JobsListQuery,
  type JobsModulePlaceholderResponse,
} from "@recruitflow/contracts";

import type { ApiWorkspaceContext } from "../workspace/workspace.service";

const reservedRoutes = [
  {
    method: "GET",
    path: "/jobs",
    purpose: "Workspace-scoped job list and intake query surface",
  },
  {
    method: "POST",
    path: "/jobs",
    purpose: "Future role intake creation entry point",
  },
  {
    method: "GET",
    path: "/jobs/:jobId",
    purpose: "Future job detail query surface",
  },
] as const;

@Injectable()
export class JobsService {
  getModulePlaceholder(
    context: ApiWorkspaceContext,
    query: JobsListQuery,
  ): JobsModulePlaceholderResponse {
    return createCrmModulePlaceholderResponse({
      context: {
        role: context.membership.role,
        workspaceId: context.workspace.id,
      },
      domain: "jobs",
      implementationStory: "RF-22 | RF-030 Create Jobs Query Layer and List Page",
      message:
        "Jobs transport now has a reserved Nest module and shared query contract so the intake branch can add real list, detail, and create behavior on top of a fixed API shape.",
      ownerBranch: "feature-jobs-intake",
      query,
      reservedRoutes: [...reservedRoutes],
    });
  }
}
