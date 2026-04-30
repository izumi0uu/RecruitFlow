import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module";

import { WorkspaceController } from "./workspace.controller";
import { WorkspaceContextGuard } from "./workspace.guard";
import { WorkspaceRoleGuard } from "./workspace-role.guard";
import { WorkspaceService } from "./workspace.service";

@Module({
  controllers: [WorkspaceController],
  exports: [WorkspaceContextGuard, WorkspaceRoleGuard, WorkspaceService],
  imports: [AuthModule],
  providers: [WorkspaceContextGuard, WorkspaceRoleGuard, WorkspaceService],
})
export class WorkspaceModule {}
