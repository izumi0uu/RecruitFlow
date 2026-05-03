import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";

import {
  type TaskMutationResponse,
  type TasksListResponse,
  taskMutationRequestSchema,
  taskParamsSchema,
  taskStatusActionRequestSchema,
  tasksListQuerySchema,
} from "@recruitflow/contracts";

import { AuthGuard } from "../auth/auth.guard";
import { CurrentWorkspaceContext } from "../workspace/current-workspace-context.decorator";
import { RequireWorkspaceRole } from "../workspace/require-workspace-role.decorator";
import { WorkspaceContextGuard } from "../workspace/workspace.guard";
import type { ApiWorkspaceContext } from "../workspace/workspace.service";
import { WorkspaceRoleGuard } from "../workspace/workspace-role.guard";

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

  @Post()
  createTask(
    @CurrentWorkspaceContext() context: ApiWorkspaceContext,
    @Body() body: unknown,
  ): Promise<TaskMutationResponse> {
    const parsedBody = taskMutationRequestSchema.safeParse(body);

    if (!parsedBody.success) {
      throw new BadRequestException(
        parsedBody.error.issues[0]?.message ?? "Invalid task payload",
      );
    }

    return this.tasksService.createTask(context, parsedBody.data);
  }

  @Patch(":taskId")
  updateTask(
    @CurrentWorkspaceContext() context: ApiWorkspaceContext,
    @Param() params: unknown,
    @Body() body: unknown,
  ): Promise<TaskMutationResponse> {
    const parsedParams = taskParamsSchema.safeParse(params);

    if (!parsedParams.success) {
      throw new BadRequestException(
        parsedParams.error.issues[0]?.message ?? "Invalid task id",
      );
    }

    const parsedBody = taskMutationRequestSchema.safeParse(body);

    if (!parsedBody.success) {
      throw new BadRequestException(
        parsedBody.error.issues[0]?.message ?? "Invalid task payload",
      );
    }

    return this.tasksService.updateTask(
      context,
      parsedParams.data.taskId,
      parsedBody.data,
    );
  }

  @Patch(":taskId/status")
  updateTaskStatus(
    @CurrentWorkspaceContext() context: ApiWorkspaceContext,
    @Param() params: unknown,
    @Body() body: unknown,
  ): Promise<TaskMutationResponse> {
    const parsedParams = taskParamsSchema.safeParse(params);

    if (!parsedParams.success) {
      throw new BadRequestException(
        parsedParams.error.issues[0]?.message ?? "Invalid task id",
      );
    }

    const parsedBody = taskStatusActionRequestSchema.safeParse(body);

    if (!parsedBody.success) {
      throw new BadRequestException(
        parsedBody.error.issues[0]?.message ?? "Invalid task status payload",
      );
    }

    return this.tasksService.updateTaskStatus(
      context,
      parsedParams.data.taskId,
      parsedBody.data,
    );
  }
}
