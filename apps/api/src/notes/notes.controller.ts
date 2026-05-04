import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";

import {
  type NoteDeleteResponse,
  type NoteMutationResponse,
  type NotesListResponse,
  noteMutationRequestSchema,
  noteParamsSchema,
  notesListQuerySchema,
} from "@recruitflow/contracts";

import { AuthGuard } from "../auth/auth.guard";
import { CurrentWorkspaceContext } from "../workspace/current-workspace-context.decorator";
import { RequireWorkspaceRole } from "../workspace/require-workspace-role.decorator";
import { WorkspaceContextGuard } from "../workspace/workspace.guard";
import type { ApiWorkspaceContext } from "../workspace/workspace.service";
import { WorkspaceRoleGuard } from "../workspace/workspace-role.guard";

// Keep this as a runtime import. Nest constructor DI needs the class token;
// `import type` is erased and becomes `Object` in decorator metadata.
import { NotesService } from "./notes.service";

@Controller("notes")
@UseGuards(AuthGuard, WorkspaceContextGuard, WorkspaceRoleGuard)
@RequireWorkspaceRole({ minRole: "coordinator" })
export class NotesController {
  constructor(private readonly notesService: NotesService) {}

  @Get()
  getNotes(
    @CurrentWorkspaceContext() context: ApiWorkspaceContext,
    @Query() query: unknown,
  ): Promise<NotesListResponse> {
    const parsedQuery = notesListQuerySchema.safeParse(query);

    if (!parsedQuery.success) {
      throw new BadRequestException(
        parsedQuery.error.issues[0]?.message ?? "Invalid notes query",
      );
    }

    return this.notesService.listNotes(context, parsedQuery.data);
  }

  @Post()
  createNote(
    @CurrentWorkspaceContext() context: ApiWorkspaceContext,
    @Body() body: unknown,
  ): Promise<NoteMutationResponse> {
    const parsedBody = noteMutationRequestSchema.safeParse(body);

    if (!parsedBody.success) {
      throw new BadRequestException(
        parsedBody.error.issues[0]?.message ?? "Invalid note payload",
      );
    }

    return this.notesService.createNote(context, parsedBody.data);
  }

  @Delete(":noteId")
  deleteNote(
    @CurrentWorkspaceContext() context: ApiWorkspaceContext,
    @Param() params: unknown,
  ): Promise<NoteDeleteResponse> {
    const parsedParams = noteParamsSchema.safeParse(params);

    if (!parsedParams.success) {
      throw new BadRequestException(
        parsedParams.error.issues[0]?.message ?? "Invalid note id",
      );
    }

    return this.notesService.deleteNote(context, parsedParams.data.noteId);
  }
}
