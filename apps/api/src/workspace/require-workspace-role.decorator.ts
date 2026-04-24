import { SetMetadata } from "@nestjs/common";

import type { WorkspaceRoleRequirement } from "./workspace.service";

export const WORKSPACE_ROLE_KEY = "workspace-role-requirement";

export const RequireWorkspaceRole = (requirement: WorkspaceRoleRequirement) =>
  SetMetadata(WORKSPACE_ROLE_KEY, requirement);
