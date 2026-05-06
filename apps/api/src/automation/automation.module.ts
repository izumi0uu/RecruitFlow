import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module";
import { WorkspaceModule } from "../workspace/workspace.module";

import { AutomationController } from "./automation.controller";
import { AutomationService } from "./automation.service";

@Module({
  controllers: [AutomationController],
  imports: [AuthModule, WorkspaceModule],
  providers: [AutomationService],
})
export class AutomationModule {}
