import {
  BadRequestException,
  Controller,
  Get,
  Query,
  UseGuards,
} from "@nestjs/common";

import {
  type TasksListResponse,
  tasksListQuerySchema,
} from "@recruitflow/contracts";

import { AuthGuard } from "../auth/auth.guard";
import { CurrentWorkspaceContext } from "../workspace/current-workspace-context.decorator";
import { RequireWorkspaceRole } from "../workspace/require-workspace-role.decorator";
import { WorkspaceContextGuard } from "../workspace/workspace.guard";
import type { ApiWorkspaceContext } from "../workspace/workspace.service";
import { WorkspaceRoleGuard } from "../workspace/workspace-role.guard";

// Keep this as a runtime import. Nest constructor DI needs the class token;
// `import type` is erased and becomes `Object` in decorator metadata.
// Context: https://biomejs.dev/linter/rules/use-import-type/#caveat-with-typescript-experimental-decorators
import { TasksService } from "./tasks.service";

@Controller("tasks")
@UseGuards(AuthGuard, WorkspaceContextGuard, WorkspaceRoleGuard)
@RequireWorkspaceRole({ minRole: "coordinator" })
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get()
  getTasks(
    @CurrentWorkspaceContext() context: ApiWorkspaceContext,
    @Query() query: unknown,
  ): Promise<TasksListResponse> {
    const parsedQuery = tasksListQuerySchema.safeParse(query);

    if (!parsedQuery.success) {
      throw new BadRequestException(
        parsedQuery.error.issues[0]?.message ?? "Invalid tasks query",
      );
    }

    return this.tasksService.listTasks(context, parsedQuery.data);
  }
}
