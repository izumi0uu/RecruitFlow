import { Module } from "@nestjs/common";

import { WorkspaceModule } from "../workspace/workspace.module";

import { AuditController } from "./audit.controller";
import { AuditService } from "./audit.service";

@Module({
  controllers: [AuditController],
  imports: [WorkspaceModule],
  providers: [AuditService],
})
export class AuditModule {}
