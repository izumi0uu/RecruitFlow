import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";

import {
  authAccountDeleteRequestSchema,
  authAccountUpdateRequestSchema,
  authPasswordUpdateRequestSchema,
  authSignInRequestSchema,
  authSignUpRequestSchema,
  createAuthSessionResponse,
  type AuthAccountDeleteResponse,
  type AuthAccountUpdateResponse,
  type AuthPasswordUpdateResponse,
  type AuthSignInResponse,
  type AuthSignOutResponse,
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

  @Post("sign-in")
  async signIn(@Body() body: unknown): Promise<AuthSignInResponse> {
    const parsedBody = authSignInRequestSchema.safeParse(body);

    if (!parsedBody.success) {
      throw new BadRequestException(
        parsedBody.error.issues[0]?.message ?? "Invalid sign-in payload",
      );
    }

    return this.authService.signIn(parsedBody.data);
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

  @Post("sign-out")
  @UseGuards(AuthGuard)
  async signOut(
    @CurrentAuthContext() authContext: ApiAuthContext,
  ): Promise<AuthSignOutResponse> {
    return this.authService.signOut(authContext);
  }

  @Patch("password")
  @UseGuards(AuthGuard)
  async updatePassword(
    @CurrentAuthContext() authContext: ApiAuthContext,
    @Body() body: unknown,
  ): Promise<AuthPasswordUpdateResponse> {
    const parsedBody = authPasswordUpdateRequestSchema.safeParse(body);

    if (!parsedBody.success) {
      throw new BadRequestException(
        parsedBody.error.issues[0]?.message ?? "Invalid password update payload",
      );
    }

    return this.authService.updatePassword(authContext, parsedBody.data);
  }

  @Patch("account")
  @UseGuards(AuthGuard)
  async updateAccount(
    @CurrentAuthContext() authContext: ApiAuthContext,
    @Body() body: unknown,
  ): Promise<AuthAccountUpdateResponse> {
    const parsedBody = authAccountUpdateRequestSchema.safeParse(body);

    if (!parsedBody.success) {
      throw new BadRequestException(
        parsedBody.error.issues[0]?.message ?? "Invalid account update payload",
      );
    }

    return this.authService.updateAccount(authContext, parsedBody.data);
  }

  @Delete("account")
  @UseGuards(AuthGuard)
  async deleteAccount(
    @CurrentAuthContext() authContext: ApiAuthContext,
    @Body() body: unknown,
  ): Promise<AuthAccountDeleteResponse> {
    const parsedBody = authAccountDeleteRequestSchema.safeParse(body);

    if (!parsedBody.success) {
      throw new BadRequestException(
        parsedBody.error.issues[0]?.message ?? "Invalid account deletion payload",
      );
    }

    return this.authService.deleteAccount(authContext, parsedBody.data);
  }
}
