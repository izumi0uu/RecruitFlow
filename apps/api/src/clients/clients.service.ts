import { Injectable } from "@nestjs/common";

import {
  createCrmModulePlaceholderResponse,
  type ClientsListQuery,
  type ClientsModulePlaceholderResponse,
} from "@recruitflow/contracts";

import type { ApiWorkspaceContext } from "../workspace/workspace.service";

const reservedRoutes = [
  {
    method: "GET",
    path: "/clients",
    purpose: "Workspace-scoped client list query surface",
  },
  {
    method: "POST",
    path: "/clients",
    purpose: "Future client creation entry point",
  },
  {
    method: "GET",
    path: "/clients/:clientId",
    purpose: "Future client detail query surface",
  },
] as const;

@Injectable()
export class ClientsService {
  getModulePlaceholder(
    context: ApiWorkspaceContext,
    query: ClientsListQuery,
  ): ClientsModulePlaceholderResponse {
    return createCrmModulePlaceholderResponse({
      context: {
        role: context.membership.role,
        workspaceId: context.workspace.id,
      },
      domain: "clients",
      implementationStory: "RF-13 | RF-020 Create Clients Query Layer and List Route",
      message:
        "Clients transport now has a reserved Nest module and shared query contract so the CRM branch can implement the real list and detail workflow without redesigning the API boundary.",
      ownerBranch: "feature-clients-crm",
      query,
      reservedRoutes: [...reservedRoutes],
    });
  }
}
