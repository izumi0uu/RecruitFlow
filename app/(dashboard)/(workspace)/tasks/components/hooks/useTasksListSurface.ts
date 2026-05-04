"use client";

import type { TaskRecord, TasksListResponse } from "@recruitflow/contracts";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import * as React from "react";

import { useUrlBackedListFilters } from "@/hooks/useUrlBackedListFilters";
import { tasksListQueryOptions } from "@/lib/query/options";
import {
  areTaskListFiltersEqual,
  normalizeTaskListFilters,
  parseTaskListFiltersFromSearchParams,
  type TaskListFilters,
  taskListFiltersToSearchParams,
} from "@/lib/tasks/filters";

import { getTaskFilterCount } from "../../utils";

type UseTasksListSurfaceOptions = {
  initialData: TasksListResponse;
  initialFilters: TaskListFilters;
};

const useTasksListSurface = ({
  initialData,
  initialFilters,
}: UseTasksListSurfaceOptions) => {
  const {
    applyFilters,
    filters,
    normalizedInitialFilters,
    searchDraft,
    setSearchDraft,
  } = useUrlBackedListFilters({
    areFiltersEqual: areTaskListFiltersEqual,
    filtersToSearchParams: taskListFiltersToSearchParams,
    initialFilters,
    normalizeFilters: normalizeTaskListFilters,
    parseFiltersFromSearchParams: parseTaskListFiltersFromSearchParams,
    searchKey: "q",
    searchResetUpdates: { page: "" },
  });
  const [selectedTaskId, setSelectedTaskId] = React.useState<string | null>(
    initialData.items[0]?.id ?? null,
  );
  const isInitialQuery = areTaskListFiltersEqual(
    filters,
    normalizedInitialFilters,
  );
  const {
    data: tasksList = initialData,
    error,
    isError,
    isFetching,
    refetch,
  } = useQuery({
    ...tasksListQueryOptions(filters),
    initialData: isInitialQuery ? initialData : undefined,
    placeholderData: keepPreviousData,
  });
  const taskItems = tasksList.items;
  const selectedTask =
    taskItems.find((task) => task.id === selectedTaskId) ??
    taskItems[0] ??
    null;
  const filterCount = getTaskFilterCount(filters);
  const hasFilters = filterCount > 0;
  const currentPage = tasksList.pagination.page;
  const totalPages = tasksList.pagination.totalPages;
  const ownerOptions = [
    { label: "All owners", value: "" },
    ...tasksList.ownerOptions.map((owner) => ({
      label: owner.name ?? owner.email,
      value: owner.id,
    })),
  ];

  React.useEffect(() => {
    if (taskItems.length === 0) {
      setSelectedTaskId(null);
      return;
    }

    if (
      !selectedTaskId ||
      !taskItems.some((task) => task.id === selectedTaskId)
    ) {
      setSelectedTaskId(taskItems[0]?.id ?? null);
    }
  }, [selectedTaskId, taskItems]);

  const resetFilters = React.useCallback(() => {
    setSearchDraft("");
    applyFilters({
      entityId: "",
      entityType: "",
      owner: "",
      page: "",
      q: "",
      status: "",
      view: "mine",
    });
  }, [applyFilters, setSearchDraft]);

  const getTaskSelectionProps = React.useCallback(
    (task: TaskRecord) => ({
      isSelected: selectedTask?.id === task.id,
      onSelect: () => {
        setSelectedTaskId(task.id);
      },
    }),
    [selectedTask],
  );

  return {
    applyFilters,
    currentPage,
    error,
    filterCount,
    filters,
    getTaskSelectionProps,
    hasFilters,
    isError,
    isFetching,
    ownerOptions,
    refetch,
    resetFilters,
    searchDraft,
    selectedTask,
    setSearchDraft,
    taskItems,
    tasksList,
    totalPages,
  };
};

export { useTasksListSurface };
