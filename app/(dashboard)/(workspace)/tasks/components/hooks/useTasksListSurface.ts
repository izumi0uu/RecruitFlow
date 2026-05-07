"use client";

import type {
  FollowUpItem,
  FollowUpTodayResponse,
  TaskRecord,
  TasksListResponse,
} from "@recruitflow/contracts";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import * as React from "react";

import { useUrlBackedListFilters } from "@/hooks/useUrlBackedListFilters";
import {
  followUpTodayQueryOptions,
  tasksListQueryOptions,
} from "@/lib/query/options";
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
  initialTodayData: FollowUpTodayResponse | null;
};

const useTasksListSurface = ({
  initialData,
  initialFilters,
  initialTodayData,
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
  const isTodayView = filters.view === "today";
  const {
    data: todayFollowUps = initialTodayData,
    error: todayError,
    isError: isTodayError,
    isFetching: isTodayFetching,
    refetch: refetchToday,
  } = useQuery({
    ...followUpTodayQueryOptions(filters),
    enabled: isTodayView,
    initialData:
      isInitialQuery && isTodayView && initialTodayData
        ? initialTodayData
        : undefined,
    placeholderData: keepPreviousData,
  });
  const taskItems = tasksList.items;
  const todayItems = todayFollowUps?.items ?? [];
  const selectedTask =
    taskItems.find((task) => task.id === selectedTaskId) ??
    taskItems[0] ??
    null;
  const selectedTodayItem =
    todayItems.find((item) => item.id === selectedTaskId) ??
    todayItems[0] ??
    null;
  const filterCount = getTaskFilterCount(filters);
  const hasFilters = filterCount > 0;
  const currentPage = tasksList.pagination.page;
  const totalPages = tasksList.pagination.totalPages;
  const currentTodayPage = todayFollowUps?.pagination.page ?? 1;
  const totalTodayPages = todayFollowUps?.pagination.totalPages ?? 1;
  const totalTodayItems = todayFollowUps?.pagination.totalItems ?? 0;
  const ownerOptions = [
    { label: "All owners", value: "" },
    ...tasksList.ownerOptions.map((owner) => ({
      label: owner.name ?? owner.email,
      value: owner.id,
    })),
  ];

  React.useEffect(() => {
    if (isTodayView) {
      if (todayItems.length === 0) {
        setSelectedTaskId(null);
        return;
      }

      if (
        !selectedTaskId ||
        !todayItems.some((item) => item.id === selectedTaskId)
      ) {
        setSelectedTaskId(todayItems[0]?.id ?? null);
      }

      return;
    }

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
  }, [isTodayView, selectedTaskId, taskItems, todayItems]);

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

  const refetchActiveView = React.useCallback(() => {
    if (isTodayView) {
      void refetchToday();
      return;
    }

    void refetch();
  }, [isTodayView, refetch, refetchToday]);

  const getTodaySelectionProps = React.useCallback(
    (item: FollowUpItem) => ({
      isSelected: selectedTaskId === item.id,
      onSelect: () => {
        setSelectedTaskId(item.id);
      },
    }),
    [selectedTaskId],
  );

  return {
    applyFilters,
    currentPage,
    currentTodayPage,
    error,
    filterCount,
    filters,
    getTaskSelectionProps,
    getTodaySelectionProps,
    hasFilters,
    isTodayError,
    isTodayFetching,
    isTodayView,
    isError,
    isFetching,
    ownerOptions,
    refetch,
    refetchActiveView,
    refetchToday,
    resetFilters,
    searchDraft,
    selectedTask,
    selectedTodayItem,
    setSearchDraft,
    taskItems,
    tasksList,
    todayError,
    todayFollowUps,
    todayItems,
    totalPages,
    totalTodayItems,
    totalTodayPages,
  };
};

export { useTasksListSurface };
