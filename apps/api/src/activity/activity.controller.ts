import {
  BadRequestException,
  Controller,
  Get,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  type ActivityTimelineResponse,
  activityTimelineQuerySchema,
} from "@recruitflow/contracts";

import { AuthGuard } from "../auth/auth.guard";
import { CurrentWorkspaceContext } from "../workspace/current-workspace-context.decorator";
import { RequireWorkspaceRole } from "../workspace/require-workspace-role.decorator";
import { WorkspaceContextGuard } from "../workspace/workspace.guard";
import type { ApiWorkspaceContext } from "../workspace/workspace.service";
import { WorkspaceRoleGuard } from "../workspace/workspace-role.guard";

// Keep this as a runtime import. Nest constructor DI needs the class token;
// `import type` is erased and becomes `Object` in decorator metadata.
import { ActivityService } from "./activity.service";

@Controller("activity")
@UseGuards(AuthGuard, WorkspaceContextGuard, WorkspaceRoleGuard)
@RequireWorkspaceRole({ minRole: "coordinator" })
export class ActivityController {
  constructor(private readonly activityService: ActivityService) {}

  @Get("timeline")
  getTimeline(
    @CurrentWorkspaceContext() context: ApiWorkspaceContext,
    @Query() query: unknown,
  ): Promise<ActivityTimelineResponse> {
    const parsedQuery = activityTimelineQuerySchema.safeParse(query);

    if (!parsedQuery.success) {
      throw new BadRequestException(
        parsedQuery.error.issues[0]?.message ?? "Invalid activity query",
      );
    }

    return this.activityService.getTimeline(context, parsedQuery.data);
  }
}
