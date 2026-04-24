import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  UseGuards,
} from "@nestjs/common";

import {
  authSignUpRequestSchema,
  createAuthSessionResponse,
  type AuthSignUpResponse,
  type AuthSessionResponse,
} from "@recruitflow/contracts";

import { AuthGuard } from "./auth.guard";
import { AuthService, type ApiAuthContext } from "./auth.service";
import { CurrentAuthContext } from "./current-auth-context.decorator";

@Controller("auth")
export class AuthController {
  private readonly authService = new AuthService();

  @Get("session")
  @UseGuards(AuthGuard)
  getSession(
    @CurrentAuthContext() authContext: ApiAuthContext,
  ): AuthSessionResponse {
    return createAuthSessionResponse(authContext);
  }

  @Post("sign-up")
  async signUp(@Body() body: unknown): Promise<AuthSignUpResponse> {
    const parsedBody = authSignUpRequestSchema.safeParse(body);

    if (!parsedBody.success) {
      throw new BadRequestException(
        parsedBody.error.issues[0]?.message ?? "Invalid sign-up payload",
      );
    }

    return this.authService.signUp(parsedBody.data);
  }
}
