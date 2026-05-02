"use client";

import { type ApiRiskFlag, apiRiskFlagValues } from "@recruitflow/contracts";
import { Check, Loader2, Pencil, Save, ShieldCheck, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useId, useState, useTransition } from "react";

import { Button } from "@/components/ui/Button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/DropdownMenu";
import { cn } from "@/lib/utils";

import { requestSubmissionFollowUpUpdate } from "./pipelineFollowUpUpdate";

const riskLabelMap: Record<ApiRiskFlag, string> = {
  compensation_risk: "Comp",
  feedback_risk: "Feedback",
  fit_risk: "Fit",
  none: "Clear",
  timing_risk: "Timing",
};

const riskDescriptionMap: Record<ApiRiskFlag, string> = {
  compensation_risk: "Offer economics",
  feedback_risk: "Client response",
  fit_risk: "Role alignment",
  none: "No active risk",
  timing_risk: "Schedule pressure",
};

const riskToneClassMap: Record<ApiRiskFlag, string> = {
  compensation_risk:
    "border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-300",
  feedback_risk:
    "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  fit_risk:
    "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300",
  none: "border-border/70 bg-surface-1 text-muted-foreground",
  timing_risk:
    "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
};

const getMutationErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Unable to update this opportunity.";

const useFollowUpMutation = ({ submissionId }: { submissionId: string }) => {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, startRefresh] = useTransition();

  const updateFollowUp = async (
    input: Parameters<typeof requestSubmissionFollowUpUpdate>[1],
  ) => {
    setError(null);

    try {
      const response = await requestSubmissionFollowUpUpdate(
        submissionId,
        input,
      );

      startRefresh(() => {
        router.refresh();
      });

      return response.submission;
    } catch (mutationError) {
      if (
        mutationError instanceof Error &&
        mutationError.message === "UNAUTHENTICATED"
      ) {
        router.push("/sign-in");
        return null;
      }

      setError(getMutationErrorMessage(mutationError));
      return null;
    }
  };

  return {
    error,
    isRefreshing,
    updateFollowUp,
  };
};

export const PipelineRiskControl = ({
  canUpdate,
  className,
  riskFlag,
  submissionId,
}: {
  canUpdate: boolean;
  className?: string;
  riskFlag: ApiRiskFlag;
  submissionId: string;
}) => {
  const [currentRiskFlag, setCurrentRiskFlag] = useState(riskFlag);
  const [pendingRiskFlag, setPendingRiskFlag] = useState<ApiRiskFlag | null>(
    null,
  );
  const { error, isRefreshing, updateFollowUp } = useFollowUpMutation({
    submissionId,
  });
  const isPending = Boolean(pendingRiskFlag) || isRefreshing;

  useEffect(() => {
    setCurrentRiskFlag(riskFlag);
  }, [riskFlag]);

  const content = (
    <>
      {pendingRiskFlag ? (
        <Loader2 className="size-3.5 animate-spin" />
      ) : (
        <span className="size-1.5 rounded-full bg-current opacity-70" />
      )}
      {riskLabelMap[currentRiskFlag]}
    </>
  );

  if (!canUpdate) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold",
          riskToneClassMap[currentRiskFlag],
          className,
        )}
      >
        <ShieldCheck className="size-3.5" />
        {riskLabelMap[currentRiskFlag]}
      </span>
    );
  }

  return (
    <div className={cn("min-w-0", className)}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60",
              riskToneClassMap[currentRiskFlag],
            )}
            disabled={isPending}
            type="button"
          >
            {content}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-60">
          {apiRiskFlagValues.map((option) => {
            const isCurrent = option === currentRiskFlag;
            const isPendingOption = option === pendingRiskFlag;

            return (
              <DropdownMenuItem
                key={option}
                className="items-start justify-between gap-3"
                disabled={isCurrent || isPending}
                onSelect={(event) => {
                  event.preventDefault();
                  setPendingRiskFlag(option);
                  void updateFollowUp({ riskFlag: option })
                    .then((submission) => {
                      if (submission) {
                        setCurrentRiskFlag(submission.riskFlag);
                      }
                    })
                    .finally(() => {
                      setPendingRiskFlag(null);
                    });
                }}
              >
                <span className="min-w-0">
                  <span className="block text-sm font-medium">
                    {riskLabelMap[option]}
                  </span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    {riskDescriptionMap[option]}
                  </span>
                </span>
                {isCurrent ? (
                  <Check className="mt-1 size-3.5" />
                ) : isPendingOption ? (
                  <Loader2 className="mt-1 size-3.5 animate-spin" />
                ) : null}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>

      {error ? (
        <p className="mt-1 text-xs leading-5 text-destructive">{error}</p>
      ) : null}
    </div>
  );
};

export const PipelineNextStepControl = ({
  canUpdate,
  className,
  compact = false,
  nextStep,
  submissionId,
}: {
  canUpdate: boolean;
  className?: string;
  compact?: boolean;
  nextStep: string | null;
  submissionId: string;
}) => {
  const [currentNextStep, setCurrentNextStep] = useState(nextStep ?? "");
  const [draftNextStep, setDraftNextStep] = useState(nextStep ?? "");
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const textareaId = useId();
  const { error, isRefreshing, updateFollowUp } = useFollowUpMutation({
    submissionId,
  });
  const normalizedDraft = draftNextStep.trim();
  const isPending = isSaving || isRefreshing;
  const canSave = normalizedDraft !== currentNextStep.trim();

  useEffect(() => {
    setCurrentNextStep(nextStep ?? "");
    setDraftNextStep(nextStep ?? "");
  }, [nextStep]);

  if (!isEditing) {
    return (
      <div
        className={cn(
          compact
            ? "min-w-0"
            : "min-h-20 rounded-[0.95rem] bg-workspace-muted-surface/48 px-3 py-3",
          className,
        )}
      >
        <div className="flex items-center justify-between gap-2">
          <p className="text-[0.66rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Next step
          </p>
          {canUpdate ? (
            <button
              aria-label="Edit next step"
              className="inline-flex size-7 items-center justify-center rounded-full border border-border/70 bg-background/72 text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              type="button"
              onClick={() => {
                setDraftNextStep(currentNextStep);
                setIsEditing(true);
              }}
            >
              <Pencil className="size-3.5" />
            </button>
          ) : null}
        </div>
        <p
          className={cn(
            "mt-2 text-sm leading-5 text-foreground/88",
            compact ? "line-clamp-2" : "line-clamp-3",
          )}
        >
          {currentNextStep || "No next step captured yet."}
        </p>
        {error ? (
          <p className="mt-1 text-xs leading-5 text-destructive">{error}</p>
        ) : null}
      </div>
    );
  }

  return (
    <div
      className={cn(
        compact
          ? "min-w-0"
          : "rounded-[0.95rem] border border-border/60 bg-workspace-muted-surface/48 px-3 py-3",
        className,
      )}
    >
      <label
        className="text-[0.66rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground"
        htmlFor={textareaId}
      >
        Next step
      </label>
      <textarea
        className="mt-2 min-h-20 w-full resize-none rounded-[0.85rem] border border-border/70 bg-background/80 px-3 py-2 text-sm leading-5 text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-foreground/25 focus:ring-2 focus:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={isPending}
        id={textareaId}
        maxLength={500}
        value={draftNextStep}
        onChange={(event) => {
          setDraftNextStep(event.target.value);
        }}
      />
      <div className="mt-2 flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">
          {normalizedDraft.length}/500
        </span>
        <div className="flex items-center gap-1.5">
          <Button
            className="rounded-full"
            disabled={isPending}
            size="sm"
            type="button"
            variant="ghost"
            onClick={() => {
              setDraftNextStep(currentNextStep);
              setIsEditing(false);
            }}
          >
            <X className="size-3.5" />
            Cancel
          </Button>
          <Button
            className="rounded-full"
            disabled={!canSave || isPending}
            size="sm"
            type="button"
            onClick={() => {
              setIsSaving(true);
              void updateFollowUp({
                nextStep: normalizedDraft.length > 0 ? normalizedDraft : null,
              })
                .then((submission) => {
                  if (submission) {
                    setCurrentNextStep(submission.nextStep ?? "");
                    setDraftNextStep(submission.nextStep ?? "");
                    setIsEditing(false);
                  }
                })
                .finally(() => {
                  setIsSaving(false);
                });
            }}
          >
            {isPending ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Save className="size-3.5" />
            )}
            Save
          </Button>
        </div>
      </div>
      {error ? (
        <p className="mt-1 text-xs leading-5 text-destructive">{error}</p>
      ) : null}
    </div>
  );
};
