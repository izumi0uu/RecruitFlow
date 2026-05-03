import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module";
import { WorkspaceModule } from "../workspace/workspace.module";

import { TasksController } from "./tasks.controller";
import { TasksService } from "./tasks.service";

@Module({
  controllers: [TasksController],
  imports: [AuthModule, WorkspaceModule],
  providers: [TasksService],
})
export class TasksModule {}
