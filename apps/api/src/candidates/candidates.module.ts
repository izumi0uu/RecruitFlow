import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module";
import { WorkspaceModule } from "../workspace/workspace.module";

import { CandidatesController } from "./candidates.controller";
import { CandidatesService } from "./candidates.service";

@Module({
  controllers: [CandidatesController],
  imports: [AuthModule, WorkspaceModule],
  providers: [CandidatesService],
})
export class CandidatesModule {}
