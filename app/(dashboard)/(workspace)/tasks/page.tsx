import {
  ModulePlaceholderPage,
  getPlaceholderViewState,
} from "@/components/workspace/ModulePlaceholderPage";

type PageProps = {
  searchParams?: Promise<{ state?: string }> | { state?: string };
};

const TasksPage = async ({ searchParams }: PageProps) => {
  const params = await Promise.resolve(searchParams ?? {});

  return (
    <ModulePlaceholderPage
      kicker="Execution rhythm"
      title="Tasks"
      description="Tasks now have a protected top-level destination, which keeps follow-up work, ownership, and overdue queues from being scattered across later branches."
      emptyTitle="No tasks to review yet"
      emptyDescription="My Tasks, workspace queues, overdue slices, and snoozed work will appear here once feature-tasks-activity implements the task system."
      ownerBranch="feature-tasks-activity"
      plannedCapabilities={[
        "Mine, workspace, overdue, snoozed, and done task perspectives",
        "Shared route entry from dashboard reminders and pipeline follow-ups",
        "A stable empty-state pattern for future execution workflows",
      ]}
      state={getPlaceholderViewState(params.state)}
    />
  );
};

export default TasksPage;
