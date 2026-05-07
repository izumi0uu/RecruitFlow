import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module";
import { WorkspaceModule } from "../workspace/workspace.module";

import { FollowUpService } from "./follow-up.service";
import { TasksController } from "./tasks.controller";
import { TasksService } from "./tasks.service";

@Module({
  controllers: [TasksController],
  imports: [AuthModule, WorkspaceModule],
  providers: [FollowUpService, TasksService],
})
export class TasksModule {}
