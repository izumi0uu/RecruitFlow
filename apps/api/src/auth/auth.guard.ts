import {
  CanActivate,
  ExecutionContext,
  Injectable,
} from "@nestjs/common";

import { AuthService, type ApiAuthContext } from "./auth.service";

export type RequestWithAuthContext = {
  authContext?: ApiAuthContext;
  headers: {
    cookie?: string;
  };
};

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<RequestWithAuthContext>();
    request.authContext = await this.authService.resolveAuthContext(request);

    return true;
  }
}
