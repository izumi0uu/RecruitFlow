import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module";
import { WorkspaceModule } from "../workspace/workspace.module";

import { NotesController } from "./notes.controller";
import { NotesService } from "./notes.service";

@Module({
  controllers: [NotesController],
  imports: [AuthModule, WorkspaceModule],
  providers: [NotesService],
})
export class NotesModule {}
