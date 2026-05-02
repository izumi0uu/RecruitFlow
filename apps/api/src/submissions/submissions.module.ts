import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module";
import { WorkspaceModule } from "../workspace/workspace.module";

import { SubmissionsController } from "./submissions.controller";
import { SubmissionsService } from "./submissions.service";

@Module({
  controllers: [SubmissionsController],
  imports: [AuthModule, WorkspaceModule],
  providers: [SubmissionsService],
})
export class SubmissionsModule {}
