"use client";

import type {
  AutomationRunCreateRequest,
  AutomationRunMutationResponse,
  AutomationRunReminderSummary,
} from "@recruitflow/contracts";
import { BellPlus, Loader2, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";

import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

const getRequestErrorMessage = async (response: Response) => {
  try {
    const body = (await response.json()) as { error?: string };

    if (body.error) {
      return body.error;
    }
  } catch {
    // Fall through to the status fallback.
  }

  return `Unable to queue reminder generation (${response.status}).`;
};

const requestReminderGenerationRun = async (
  payload: AutomationRunCreateRequest,
) => {
  const response = await fetch("/api/automation/runs", {
    body: JSON.stringify(payload),
    headers: {
      "content-type": "application/json",
    },
    method: "POST",
  });

  if (response.status === 401) {
    throw new Error("UNAUTHENTICATED");
  }

  if (!response.ok) {
    throw new Error(await getRequestErrorMessage(response));
  }

  return (await response.json()) as AutomationRunMutationResponse;
};

const reasonLabelMap: Record<
  AutomationRunReminderSummary["suggestions"][number]["reason"],
  string
> = {
  overdue_task: "Overdue task",
  snoozed_task_due: "Snoozed reminder due",
  stale_submission: "Stale submission",
};

type ReminderGenerationPanelProps = {
  targetSetSize: number;
  workspaceId: string;
};

export const ReminderGenerationPanel = ({
  targetSetSize,
  workspaceId,
}: ReminderGenerationPanelProps) => {
  const router = useRouter();
  const [summary, setSummary] =
    React.useState<AutomationRunReminderSummary | null>(null);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(
    null,
  );
  const [error, setError] = React.useState<string | null>(null);
  const [isPending, startTransition] = React.useTransition();

  const handleGenerate = () => {
    if (isPending) {
      return;
    }

    setError(null);
    setSuccessMessage(null);

    startTransition(async () => {
      try {
        const response = await requestReminderGenerationRun({
          entityId: workspaceId,
          entityType: "workspace",
          type: "reminder_generation",
        });

        setSummary(response.reminderSummary ?? null);
        setSuccessMessage(response.message);
        router.refresh();
      } catch (requestError) {
        if (
          requestError instanceof Error &&
          requestError.message === "UNAUTHENTICATED"
        ) {
          router.push("/sign-in");
          return;
        }

        setError(
          requestError instanceof Error
            ? requestError.message
            : "Unable to queue reminder generation.",
        );
      }
    });
  };

  return (
    <div className="rounded-[1.45rem] border border-border/70 bg-surface-1/72 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Sparkles className="size-4" />
            Reminder generation
          </p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Suggestion-only automation: queues an observable run from overdue,
            due-snoozed, and stale follow-up signals without creating tasks or
            changing submission truth.
          </p>
        </div>
        <Button
          className="shrink-0 rounded-full"
          disabled={isPending}
          type="button"
          variant="outline"
          onClick={handleGenerate}
        >
          {isPending ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Queueing...
            </>
          ) : (
            <>
              <BellPlus className="size-4" />
              Generate suggestions
            </>
          )}
        </Button>
      </div>

      <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold text-muted-foreground">
        <span className="rounded-full border border-border/70 bg-background/55 px-2.5 py-1">
          {targetSetSize} active targets visible
        </span>
        {summary ? (
          <span className="rounded-full border border-sky-500/25 bg-sky-500/10 px-2.5 py-1 text-sky-700 dark:text-sky-300">
            {summary.targetSetSize} suggestions · {summary.idempotencyKey}
          </span>
        ) : null}
      </div>

      {summary?.suggestions.length ? (
        <div className="mt-3 space-y-2">
          {summary.suggestions.slice(0, 3).map((suggestion) => (
            <div
              key={`${suggestion.reason}:${suggestion.id}`}
              className="rounded-[1rem] border border-border/70 bg-background/55 px-3 py-2 text-sm"
            >
              <p className="font-medium text-foreground">
                {suggestion.suggestedTitle}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {reasonLabelMap[suggestion.reason]} · due{" "}
                {suggestion.dueAt?.slice(0, 10) ?? "not set"}
              </p>
            </div>
          ))}
        </div>
      ) : null}

      {successMessage ? (
        <p className="status-message status-success mt-3">{successMessage}</p>
      ) : null}
      {error ? (
        <p className="status-message status-error mt-3">{error}</p>
      ) : null}

      <p
        className={cn(
          "mt-3 text-xs leading-5 text-muted-foreground",
          summary?.targetSetSize === 0 &&
            "text-emerald-700 dark:text-emerald-300",
        )}
      >
        Re-running over the same target set returns the same idempotency key;
        converting suggestions into tasks remains an explicit user action.
      </p>
    </div>
  );
};
