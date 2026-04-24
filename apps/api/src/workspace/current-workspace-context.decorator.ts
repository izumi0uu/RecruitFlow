import { createParamDecorator, type ExecutionContext } from "@nestjs/common";

import type { RequestWithWorkspaceContext } from "./workspace.guard";

export const CurrentWorkspaceContext = createParamDecorator(
  (_data: unknown, context: ExecutionContext) => {
    const request = context
      .switchToHttp()
      .getRequest<RequestWithWorkspaceContext>();

    return request.workspaceContext;
  },
);
