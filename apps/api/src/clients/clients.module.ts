import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module";
import { WorkspaceModule } from "../workspace/workspace.module";

import { ClientsController } from "./clients.controller";
import { ClientsService } from "./clients.service";

@Module({
  controllers: [ClientsController],
  imports: [AuthModule, WorkspaceModule],
  providers: [ClientsService],
})
export class ClientsModule {}
