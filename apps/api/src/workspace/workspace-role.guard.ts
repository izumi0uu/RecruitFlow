import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";

import { workspaceRoleValues, type WorkspaceRole } from "@/lib/db/schema";

import { WORKSPACE_ROLE_KEY } from "./require-workspace-role.decorator";
import { WorkspaceContextGuard } from "./workspace.guard";
import type {
  RequestWithWorkspaceContext,
} from "./workspace.guard";
import type { WorkspaceRoleRequirement } from "./workspace.service";

const roleRank = Object.fromEntries(
  workspaceRoleValues.map((role, index) => [role, index]),
) as Record<WorkspaceRole, number>;

const hasRequiredRole = (
  currentRole: WorkspaceRole,
  requirement: WorkspaceRoleRequirement,
) => {
  if (requirement.allowedRoles) {
    return requirement.allowedRoles.includes(currentRole);
  }

  return roleRank[currentRole] <= roleRank[requirement.minRole];
};

@Injectable()
export class WorkspaceRoleGuard implements CanActivate {
  private readonly workspaceContextGuard = new WorkspaceContextGuard();

  async canActivate(context: ExecutionContext) {
    const requirement =
      Reflect.getMetadata(WORKSPACE_ROLE_KEY, context.getHandler()) ??
      Reflect.getMetadata(WORKSPACE_ROLE_KEY, context.getClass());

    if (!requirement) {
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<RequestWithWorkspaceContext>();

    if (!request.workspaceContext) {
      await this.workspaceContextGuard.canActivate(context);
    }

    if (
      hasRequiredRole(request.workspaceContext!.membership.role, requirement)
    ) {
      return true;
    }

    throw new ForbiddenException("Forbidden");
  }
}
