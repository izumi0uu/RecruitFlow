import type {
  FollowUpTodayResponse,
  TasksListResponse,
} from "@recruitflow/contracts";
import { redirect } from "next/navigation";

import { isApiRequestError, requestApiJson } from "@/lib/api/client";
import {
  followUpTodayFiltersToSearchParams,
  getApiTaskListFilters,
  parseTaskListFiltersFromRecord,
  type TaskListFilters,
  taskListFiltersToSearchParams,
} from "@/lib/tasks/filters";

import { TasksListSurface } from "./components/TasksListSurface";

type PageProps = {
  searchParams?:
    | Promise<Record<string, string | string[] | undefined>>
    | Record<string, string | string[] | undefined>;
};

const buildTasksApiPath = (filters: TaskListFilters) => {
  const queryString = taskListFiltersToSearchParams(
    getApiTaskListFilters(filters),
    {
      includePageSize: true,
    },
  ).toString();

  return `/tasks${queryString ? `?${queryString}` : ""}`;
};

const buildTodayApiPath = (filters: TaskListFilters) => {
  const queryString = followUpTodayFiltersToSearchParams(filters, {
    includePageSize: true,
  }).toString();

  return `/tasks/today${queryString ? `?${queryString}` : ""}`;
};

const getTasksList = async (filters: TaskListFilters) => {
  try {
    return await requestApiJson<TasksListResponse>(buildTasksApiPath(filters));
  } catch (error) {
    if (isApiRequestError(error) && error.status === 401) {
      redirect("/sign-in");
    }

    throw error;
  }
};

const getTodayFollowUps = async (filters: TaskListFilters) => {
  try {
    return await requestApiJson<FollowUpTodayResponse>(
      buildTodayApiPath(filters),
    );
  } catch (error) {
    if (isApiRequestError(error) && error.status === 401) {
      redirect("/sign-in");
    }

    throw error;
  }
};

const TasksPage = async ({ searchParams }: PageProps) => {
  const params = await Promise.resolve(searchParams ?? {});
  const initialFilters = parseTaskListFiltersFromRecord(params);
  const [tasksList, todayFollowUps] = await Promise.all([
    getTasksList(initialFilters),
    initialFilters.view === "today"
      ? getTodayFollowUps(initialFilters)
      : Promise.resolve(null),
  ]);

  return (
    <TasksListSurface
      initialData={tasksList}
      initialFilters={initialFilters}
      initialTodayData={todayFollowUps}
    />
  );
};

export default TasksPage;
