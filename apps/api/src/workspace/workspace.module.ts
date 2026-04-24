import { Module } from "@nestjs/common";

import { WorkspaceController } from "./workspace.controller";
import { WorkspaceContextGuard } from "./workspace.guard";
import { WorkspaceRoleGuard } from "./workspace-role.guard";
import { WorkspaceService } from "./workspace.service";

@Module({
  controllers: [WorkspaceController],
  providers: [WorkspaceContextGuard, WorkspaceRoleGuard, WorkspaceService],
})
export class WorkspaceModule {}
