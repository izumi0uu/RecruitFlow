"use client";

import type {
  ApiUserReference,
  TaskFormEntityOption,
  TaskMutationResponse,
  TaskRecord,
  TaskWorkspacePermissions,
} from "@recruitflow/contracts";
import {
  CalendarClock,
  Link2,
  Loader2,
  Plus,
  Save,
  Sparkles,
} from "lucide-react";
import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/Button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/Dialog";
import { FilterSelect } from "@/components/ui/FilterSelect";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";

import {
  buildTaskFormValues,
  buildTaskFormValuesFromRecord,
  getTaskEntityKey,
  type TaskFormValues,
} from "../utils";
import { useTaskMutation } from "./hooks/useTaskMutations";

type TaskMutationMode = "create" | "edit";

type TaskMutationDialogProps = {
  assigneeOptions?: ApiUserReference[];
  defaultAssignedToUserId?: string | null;
  defaultEntityOption?: TaskFormEntityOption | null;
  description?: string;
  entityOptions: TaskFormEntityOption[];
  lockEntity?: boolean;
  mode: TaskMutationMode;
  onOpenChange: (open: boolean) => void;
  onTaskSaved: (response: TaskMutationResponse) => void;
  open: boolean;
  ownerOptions: ApiUserReference[];
  permissions?: TaskWorkspacePermissions;
  seedTask?: TaskRecord | null;
  task?: TaskRecord | null;
};

const getDefaultDueDate = () => {
  const value = new Date();
  value.setDate(value.getDate() + 1);

  return value.toISOString().slice(0, 10);
};

const getInitialTaskValues = ({
  assigneeOptions,
  defaultAssignedToUserId,
  defaultEntityOption,
  entityOptions,
  mode,
  ownerOptions,
  seedTask,
  task,
}: Pick<
  TaskMutationDialogProps,
  | "assigneeOptions"
  | "defaultAssignedToUserId"
  | "defaultEntityOption"
  | "entityOptions"
  | "mode"
  | "ownerOptions"
  | "seedTask"
  | "task"
>): TaskFormValues => {
  if (mode === "edit" && task) {
    return buildTaskFormValuesFromRecord(task);
  }

  const availableAssigneeOptions = assigneeOptions?.length
    ? assigneeOptions
    : ownerOptions;
  const seededEntityKey = seedTask
    ? getTaskEntityKey(seedTask.entityType, seedTask.entityId)
    : defaultEntityOption
      ? getTaskEntityKey(
          defaultEntityOption.entityType,
          defaultEntityOption.entityId,
        )
      : "";
  const entityKey = entityOptions.some(
    (option) =>
      getTaskEntityKey(option.entityType, option.entityId) === seededEntityKey,
  )
    ? seededEntityKey
    : "";
  const defaultAssignee =
    defaultAssignedToUserId &&
    availableAssigneeOptions.some(
      (owner) => owner.id === defaultAssignedToUserId,
    )
      ? defaultAssignedToUserId
      : null;
  const seededAssignee =
    seedTask?.assignedToUserId &&
    availableAssigneeOptions.some(
      (owner) => owner.id === seedTask.assignedToUserId,
    )
      ? seedTask.assignedToUserId
      : null;

  return buildTaskFormValues({
    assignedToUserId:
      seededAssignee ??
      defaultAssignee ??
      availableAssigneeOptions[0]?.id ??
      "",
    dueAt: getDefaultDueDate(),
    entityKey,
  });
};

const getEntityOptionLabel = (option: TaskFormEntityOption) =>
  `${option.label}${option.secondaryLabel ? ` / ${option.secondaryLabel}` : ""}`;

const TaskMutationDialog = ({
  assigneeOptions,
  defaultAssignedToUserId,
  defaultEntityOption,
  description,
  entityOptions,
  lockEntity = false,
  mode,
  onOpenChange,
  onTaskSaved,
  open,
  ownerOptions,
  permissions,
  seedTask,
  task,
}: TaskMutationDialogProps) => {
  const [values, setValues] = useState<TaskFormValues>(() =>
    getInitialTaskValues({
      assigneeOptions,
      defaultAssignedToUserId,
      defaultEntityOption,
      entityOptions,
      mode,
      ownerOptions,
      seedTask,
      task,
    }),
  );
  const availableAssigneeOptions = useMemo(
    () => (assigneeOptions?.length ? assigneeOptions : ownerOptions),
    [assigneeOptions, ownerOptions],
  );
  const canAssignTasks = permissions?.canAssignTasks ?? true;
  const ownerSelectOptions = useMemo(
    () =>
      availableAssigneeOptions.map((owner) => ({
        label: owner.name ?? owner.email,
        value: owner.id,
      })),
    [availableAssigneeOptions],
  );
  const entitySelectOptions = useMemo(
    () =>
      entityOptions.map((option) => ({
        label: getEntityOptionLabel(option),
        value: getTaskEntityKey(option.entityType, option.entityId),
      })),
    [entityOptions],
  );
  const { error, isPending, resetError, saveTask } = useTaskMutation({
    mode,
    taskId: task?.id,
    onSuccess: (response) => {
      onTaskSaved(response);
      onOpenChange(false);
    },
  });
  const isEditMode = mode === "edit";

  useEffect(() => {
    if (!open) {
      return;
    }

    resetError();
    setValues(
      getInitialTaskValues({
        assigneeOptions,
        defaultAssignedToUserId,
        defaultEntityOption,
        entityOptions,
        mode,
        ownerOptions,
        seedTask,
        task,
      }),
    );
  }, [
    assigneeOptions,
    defaultAssignedToUserId,
    defaultEntityOption,
    entityOptions,
    mode,
    open,
    ownerOptions,
    resetError,
    seedTask,
    task,
  ]);

  const updateValue = (field: keyof TaskFormValues, value: string) => {
    setValues((currentValues) => ({
      ...currentValues,
      [field]: value,
    }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    saveTask(values);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>{isEditMode ? "Edit task" : "Create task"}</DialogTitle>
          <DialogDescription>
            {description ??
              "Capture the follow-up, ownership, due date, and business record in one place."}
          </DialogDescription>
        </DialogHeader>

        {isEditMode && !task ? (
          <p className="status-message border-border/70 bg-surface-1/70 text-muted-foreground">
            Select a task to edit.
          </p>
        ) : (
          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="rounded-[1.65rem] border border-border/70 bg-workspace-muted-surface/45 p-4">
              <div className="flex items-start gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-[1.05rem] border border-border/70 bg-background/72">
                  <Sparkles className="size-4 text-muted-foreground" />
                </span>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {isEditMode ? "Update follow-up context" : "Task baseline"}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    Status actions stay in their own flow; this form only
                    manages the task body, owner, due date, and link.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-2 lg:col-span-2">
                <Label htmlFor={`task-${mode}-title`}>Task title</Label>
                <Input
                  id={`task-${mode}-title`}
                  placeholder="Follow up with Acme on Alex interview feedback"
                  required
                  value={values.title}
                  onChange={(event) => {
                    updateValue("title", event.target.value);
                  }}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor={`task-${mode}-entity`}>Linked record</Label>
                <FilterSelect
                  id={`task-${mode}-entity`}
                  value={values.entityKey}
                  options={entitySelectOptions}
                  placeholder="Select client or submission"
                  disabled={lockEntity}
                  onValueChange={(entityKey) => {
                    updateValue("entityKey", entityKey);
                  }}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor={`task-${mode}-assignee`}>Assignee</Label>
                <FilterSelect
                  id={`task-${mode}-assignee`}
                  value={values.assignedToUserId}
                  options={ownerSelectOptions}
                  placeholder="Select owner"
                  disabled={!canAssignTasks}
                  onValueChange={(assignedToUserId) => {
                    updateValue("assignedToUserId", assignedToUserId);
                  }}
                />
                {!canAssignTasks ? (
                  <p className="text-xs leading-5 text-muted-foreground">
                    Coordinator tasks stay assigned to you.
                  </p>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor={`task-${mode}-due`}>Due date</Label>
                <Input
                  id={`task-${mode}-due`}
                  type="date"
                  required
                  leadingIcon={<CalendarClock className="size-4" />}
                  value={values.dueAt}
                  onChange={(event) => {
                    updateValue("dueAt", event.target.value);
                  }}
                />
              </div>

              <div className="rounded-[1.25rem] border border-border/70 bg-surface-1/60 p-4">
                <div className="flex items-start gap-3">
                  <Link2 className="mt-0.5 size-4 text-muted-foreground" />
                  <p className="text-sm leading-6 text-muted-foreground">
                    {lockEntity
                      ? "This quick task inherits the current business record, while the API still validates the workspace link."
                      : "The tasks inbox keeps the full selector focused, while quick-entry surfaces inherit job, candidate, client, or submission links."}
                  </p>
                </div>
              </div>

              <div className="space-y-2 lg:col-span-2">
                <Label htmlFor={`task-${mode}-description`}>Note</Label>
                <textarea
                  id={`task-${mode}-description`}
                  className="input min-h-28 resize-y py-3"
                  placeholder="Prep detail, handoff note, or the exact follow-up the team should remember."
                  value={values.description}
                  onChange={(event) => {
                    updateValue("description", event.target.value);
                  }}
                />
              </div>
            </div>

            {error ? (
              <p className="status-message status-error">{error}</p>
            ) : null}

            <div className="flex flex-wrap items-center justify-end gap-3">
              <DialogClose asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-full"
                >
                  Close
                </Button>
              </DialogClose>
              <Button
                type="submit"
                className="rounded-full"
                disabled={isPending}
              >
                {isPending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Saving...
                  </>
                ) : isEditMode ? (
                  <>
                    <Save className="size-4" />
                    Save task
                  </>
                ) : (
                  <>
                    <Plus className="size-4" />
                    Create task
                  </>
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};

export { TaskMutationDialog };
