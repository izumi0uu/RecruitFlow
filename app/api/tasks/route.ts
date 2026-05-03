import type {
  TaskMutationResponse,
  TasksListResponse,
} from "@recruitflow/contracts";
import type { NextRequest } from "next/server";

import { withBffApiErrorResponse } from "@/lib/api/bff";
import { requestApiJson } from "@/lib/api/client";

export const GET = (request: NextRequest) =>
  withBffApiErrorResponse(async () => {
    const queryString = request.nextUrl.searchParams.toString();
    const tasks = await requestApiJson<TasksListResponse>(
      `/tasks${queryString ? `?${queryString}` : ""}`,
    );

    return Response.json(tasks);
  });

export const POST = (request: NextRequest) =>
  withBffApiErrorResponse(async () => {
    const payload = await request.json();
    const task = await requestApiJson<TaskMutationResponse>("/tasks", {
      method: "POST",
      json: payload,
    });

    return Response.json(task, { status: 201 });
  });
