import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module";
import { WorkspaceModule } from "../workspace/workspace.module";

import { MembersController } from "./members.controller";
import { MembersService } from "./members.service";

@Module({
  controllers: [MembersController],
  imports: [AuthModule, WorkspaceModule],
  providers: [MembersService],
})
export class MembersModule {}
