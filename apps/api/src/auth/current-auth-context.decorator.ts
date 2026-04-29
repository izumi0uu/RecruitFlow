import { createParamDecorator, type ExecutionContext } from "@nestjs/common";

import type { RequestWithAuthContext } from "./auth.guard";

export const CurrentAuthContext = createParamDecorator(
  (_data: unknown, context: ExecutionContext) => {
    const request = context.switchToHttp().getRequest<RequestWithAuthContext>();

    return request.authContext;
  },
);
