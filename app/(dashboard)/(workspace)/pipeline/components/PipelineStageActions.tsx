"use client";

import {
  type ApiSubmissionStage,
  apiDefaultJobStageTemplate,
} from "@recruitflow/contracts";
import { ArrowRight, Check, Loader2, Lock, MoveRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/Button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/DropdownMenu";
import { cn } from "@/lib/utils";

import { requestSubmissionStageTransition } from "./pipelineStageTransition";

type PipelineStageActionsProps = {
  canChangeStage: boolean;
  className?: string;
  compact?: boolean;
  currentStage: ApiSubmissionStage;
  submissionId: string;
};

const stageOptions = apiDefaultJobStageTemplate.map((stage) => ({ ...stage }));

const getStageLabel = (stageKey: ApiSubmissionStage) =>
  stageOptions.find((stage) => stage.key === stageKey)?.label ?? stageKey;

const getNextStage = (currentStage: ApiSubmissionStage) => {
  const currentIndex = stageOptions.findIndex(
    (stage) => stage.key === currentStage,
  );

  return currentIndex >= 0 ? stageOptions[currentIndex + 1] : undefined;
};

export const PipelineStageActions = ({
  canChangeStage,
  className,
  compact = false,
  currentStage,
  submissionId,
}: PipelineStageActionsProps) => {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pendingStage, setPendingStage] = useState<ApiSubmissionStage | null>(
    null,
  );
  const [isRefreshing, startRefresh] = useTransition();
  const nextStage = getNextStage(currentStage);
  const isPending = Boolean(pendingStage) || isRefreshing;

  const updateStage = async (stage: ApiSubmissionStage) => {
    if (!canChangeStage || stage === currentStage || pendingStage) {
      return;
    }

    setError(null);
    setPendingStage(stage);

    try {
      await requestSubmissionStageTransition(submissionId, stage);
      startRefresh(() => {
        router.refresh();
      });
    } catch (mutationError) {
      if (
        mutationError instanceof Error &&
        mutationError.message === "UNAUTHENTICATED"
      ) {
        router.push("/sign-in");
        return;
      }

      setError(
        mutationError instanceof Error
          ? mutationError.message
          : "Unable to update stage.",
      );
    } finally {
      setPendingStage(null);
    }
  };

  if (!canChangeStage) {
    return (
      <div
        className={cn(
          "flex items-center gap-1.5 rounded-full border border-border/70 bg-surface-1 px-2.5 py-1 text-xs font-semibold text-muted-foreground",
          className,
        )}
      >
        <Lock className="size-3.5" />
        Read-only
      </div>
    );
  }

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <Button
        className="rounded-full"
        disabled={!nextStage || isPending}
        size="sm"
        type="button"
        onClick={() => {
          if (nextStage) {
            void updateStage(nextStage.key);
          }
        }}
      >
        {pendingStage === nextStage?.key ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <ArrowRight className="size-3.5" />
        )}
        {compact
          ? "Advance"
          : nextStage
            ? `Advance to ${nextStage.label}`
            : "Closed"}
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            className="rounded-full"
            disabled={isPending}
            size="sm"
            type="button"
            variant="outline"
          >
            <MoveRight className="size-3.5" />
            Move stage
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          {stageOptions.map((stage) => {
            const isCurrentStage = stage.key === currentStage;
            const isPendingStage = stage.key === pendingStage;

            return (
              <DropdownMenuItem
                key={stage.key}
                disabled={isCurrentStage || isPending}
                className="cursor-pointer justify-between"
                onSelect={(event) => {
                  event.preventDefault();
                  void updateStage(stage.key);
                }}
              >
                <span>{stage.label}</span>
                {isCurrentStage ? (
                  <Check className="size-3.5" />
                ) : isPendingStage ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : null}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>

      {error ? (
        <p className="basis-full text-xs leading-5 text-destructive">{error}</p>
      ) : !compact && pendingStage ? (
        <p className="basis-full text-xs leading-5 text-muted-foreground">
          Moving to {getStageLabel(pendingStage)}...
        </p>
      ) : null}
    </div>
  );
};
