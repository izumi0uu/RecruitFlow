import {
  CanActivate,
  ExecutionContext,
  Injectable,
} from "@nestjs/common";

import type { RequestWithAuthContext } from "../auth/auth.guard";

import {
  WorkspaceService,
  type ApiWorkspaceContext,
} from "./workspace.service";

export type RequestWithWorkspaceContext = RequestWithAuthContext & {
  workspaceContext?: ApiWorkspaceContext;
};

@Injectable()
export class WorkspaceContextGuard implements CanActivate {
  constructor(private readonly workspaceService: WorkspaceService) {}

  async canActivate(context: ExecutionContext) {
    const request = context
      .switchToHttp()
      .getRequest<RequestWithWorkspaceContext>();

    request.workspaceContext = await this.workspaceService.requireWorkspaceContext(
      request.authContext!.userId,
    );

    return true;
  }
}
