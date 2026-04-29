import { Injectable } from "@nestjs/common";

import {
  createCrmModulePlaceholderResponse,
  type CandidatesListQuery,
  type CandidatesModulePlaceholderResponse,
} from "@recruitflow/contracts";

import type { ApiWorkspaceContext } from "../workspace/workspace.service";

const reservedRoutes = [
  {
    method: "GET",
    path: "/candidates",
    purpose: "Workspace-scoped candidate list query surface",
  },
  {
    method: "POST",
    path: "/candidates",
    purpose: "Future candidate creation entry point",
  },
  {
    method: "GET",
    path: "/candidates/:candidateId",
    purpose: "Future candidate detail query surface",
  },
] as const;

@Injectable()
export class CandidatesService {
  getModulePlaceholder(
    context: ApiWorkspaceContext,
    query: CandidatesListQuery,
  ): CandidatesModulePlaceholderResponse {
    return createCrmModulePlaceholderResponse({
      context: {
        role: context.membership.role,
        workspaceId: context.workspace.id,
      },
      domain: "candidates",
      implementationStory:
        "RF-31 | RF-040 Create Candidates Query Layer and List Page",
      message:
        "Candidates transport now has a reserved Nest module and shared query contract so the candidate and document branch can implement the real profile workflow without inventing a fresh API contract.",
      ownerBranch: "feature-candidates-documents",
      query,
      reservedRoutes: [...reservedRoutes],
    });
  }
}
