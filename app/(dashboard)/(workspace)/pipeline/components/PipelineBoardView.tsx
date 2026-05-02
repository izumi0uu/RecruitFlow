"use client";

import {
  type CollisionDetection,
  closestCorners,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  pointerWithin,
  rectIntersection,
  TouchSensor,
  type UniqueIdentifier,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type {
  ApiSubmissionStage,
  SubmissionRecord,
} from "@recruitflow/contracts";
import { CalendarClock, GripVertical, Loader2, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import type { CSSProperties, ReactNode } from "react";
import { useEffect, useMemo, useState, useTransition } from "react";

import { TrackedLink } from "@/components/navigation/TrackedLink";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

import {
  PipelineNextStepControl,
  PipelineRiskControl,
} from "./PipelineFollowUpControls";
import { PipelineStageActions } from "./PipelineStageActions";
import type { PipelineStageGroup } from "./PipelineSurface";
import { requestSubmissionStageTransition } from "./utils/pipelineStageTransition";

const stageAccentClassMap: Record<ApiSubmissionStage, string> = {
  client_interview: "bg-sky-500",
  lost: "bg-slate-400",
  offer: "bg-violet-500",
  placed: "bg-emerald-500",
  screening: "bg-amber-500",
  sourced: "bg-zinc-500",
  submitted: "bg-cyan-500",
};

const stageBorderClassMap: Record<ApiSubmissionStage, string> = {
  client_interview: "border-sky-500/30",
  lost: "border-slate-400/35",
  offer: "border-violet-500/30",
  placed: "border-emerald-500/30",
  screening: "border-amber-500/30",
  sourced: "border-zinc-500/30",
  submitted: "border-cyan-500/30",
};

const stageDropTargetClassMap: Record<ApiSubmissionStage, string> = {
  client_interview:
    "border-sky-500/65 bg-sky-500/20 ring-sky-500/30 dark:border-sky-500/45 dark:bg-sky-500/15 dark:ring-sky-500/25",
  lost: "border-slate-500/65 bg-slate-500/20 ring-slate-500/30 dark:border-slate-400/45 dark:bg-slate-400/15 dark:ring-slate-400/25",
  offer:
    "border-violet-500/65 bg-violet-500/20 ring-violet-500/30 dark:border-violet-500/45 dark:bg-violet-500/15 dark:ring-violet-500/25",
  placed:
    "border-emerald-500/65 bg-emerald-500/20 ring-emerald-500/30 dark:border-emerald-500/45 dark:bg-emerald-500/15 dark:ring-emerald-500/25",
  screening:
    "border-amber-500/65 bg-amber-500/20 ring-amber-500/30 dark:border-amber-500/45 dark:bg-amber-500/15 dark:ring-amber-500/25",
  sourced:
    "border-zinc-500/65 bg-zinc-500/20 ring-zinc-500/30 dark:border-zinc-400/45 dark:bg-zinc-400/15 dark:ring-zinc-400/25",
  submitted:
    "border-cyan-500/65 bg-cyan-500/20 ring-cyan-500/30 dark:border-cyan-500/45 dark:bg-cyan-500/15 dark:ring-cyan-500/25",
};

// Multiple-container boards need more than one collision strategy: pointer hits
// make empty columns reliable, while the fallbacks keep keyboard and edge cases usable.
// dnd-kit docs: https://dndkit.com/legacy/api-documentation/context-provider/collision-detection-algorithms/
const pipelineCollisionDetection: CollisionDetection = (args) => {
  const pointerCollisions = pointerWithin(args);

  if (pointerCollisions.length > 0) {
    return pointerCollisions;
  }

  const intersectionCollisions = rectIntersection(args);

  if (intersectionCollisions.length > 0) {
    return intersectionCollisions;
  }

  return closestCorners(args);
};

const stageKeys = new Set<ApiSubmissionStage>([
  "sourced",
  "screening",
  "submitted",
  "client_interview",
  "offer",
  "placed",
  "lost",
]);

const formatDate = (value: string | null) => {
  if (!value) {
    return "No touch yet";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Date pending";
  }

  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
  }).format(date);
};

const getOwnerLabel = (submission: SubmissionRecord) =>
  submission.owner?.name ?? submission.owner?.email ?? "Unassigned";

const getCandidateTitle = (submission: SubmissionRecord) =>
  submission.candidate?.fullName ?? "Unknown candidate";

const getCandidateSubtitle = (submission: SubmissionRecord) =>
  [submission.candidate?.currentTitle, submission.candidate?.currentCompany]
    .filter(Boolean)
    .join(" at ") ||
  submission.candidate?.headline ||
  submission.candidate?.source ||
  "Candidate context pending";

const getRoleTitle = (submission: SubmissionRecord) =>
  submission.job?.title ?? "Unknown role";

const getClientName = (submission: SubmissionRecord) =>
  submission.job?.client?.name ?? "Client pending";

const getTouchValue = (submission: SubmissionRecord) =>
  submission.lastTouchAt ?? submission.updatedAt ?? submission.createdAt;

const getDerivedStage = (stage: PipelineStageGroup): PipelineStageGroup => ({
  ...stage,
  riskCount: stage.items.filter((submission) => submission.riskFlag !== "none")
    .length,
});

const getStageKeyForId = (
  groups: PipelineStageGroup[],
  id: UniqueIdentifier,
): ApiSubmissionStage | null => {
  const rawId = String(id);

  // dnd-kit may report either a column id or a card id; normalize both to a stage.
  if (stageKeys.has(rawId as ApiSubmissionStage)) {
    return rawId as ApiSubmissionStage;
  }

  return (
    groups.find((stage) =>
      stage.items.some((submission) => submission.id === rawId),
    )?.key ?? null
  );
};

const findSubmission = (
  groups: PipelineStageGroup[],
  submissionId: string | null,
) => {
  if (!submissionId) {
    return null;
  }

  for (const stage of groups) {
    const submission = stage.items.find((item) => item.id === submissionId);

    if (submission) {
      return submission;
    }
  }

  return null;
};

const moveSubmissionToStage = (
  groups: PipelineStageGroup[],
  submissionId: string,
  targetStage: ApiSubmissionStage,
) => {
  // Keep the board responsive with an optimistic local move while the API writes audit state.
  let movingSubmission: SubmissionRecord | null = null;
  const groupsWithoutSubmission = groups.map((stage) => ({
    ...stage,
    items: stage.items.filter((submission) => {
      if (submission.id === submissionId) {
        movingSubmission = submission;
        return false;
      }

      return true;
    }),
  }));

  if (!movingSubmission) {
    return groups;
  }

  const movedSubmission = movingSubmission as SubmissionRecord;

  return groupsWithoutSubmission.map((stage) =>
    getDerivedStage({
      ...stage,
      items:
        stage.key === targetStage
          ? [{ ...movedSubmission, stage: targetStage }, ...stage.items]
          : stage.items,
    }),
  );
};

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Unable to move this opportunity.";

type DragHandleProps = {
  attributes: ReturnType<typeof useSortable>["attributes"];
  disabled: boolean;
  listeners: ReturnType<typeof useSortable>["listeners"];
  setActivatorNodeRef: (node: HTMLElement | null) => void;
};

const dragHandleButtonClassName =
  "size-8 border-border/70 bg-background/72 text-muted-foreground hover:bg-surface-2 hover:text-foreground";

const OpportunityCard = ({
  canChangeStage,
  detailHref,
  dragHandle,
  isDragging = false,
  isOverlay = false,
  isSelected = false,
  isPending = false,
  showDragHandlePreview = false,
  submission,
}: {
  canChangeStage: boolean;
  detailHref?: string;
  dragHandle?: DragHandleProps;
  isDragging?: boolean;
  isOverlay?: boolean;
  isSelected?: boolean;
  isPending?: boolean;
  showDragHandlePreview?: boolean;
  submission: SubmissionRecord;
}) => (
  <article
    className={cn(
      "group relative w-full overflow-hidden rounded-[1.1rem] border bg-background/76 p-3.5 shadow-[0_20px_48px_-42px_var(--shadow-color)] transition-[box-shadow,opacity,transform]",
      stageBorderClassMap[submission.stage],
      detailHref &&
        !isOverlay &&
        "hover:-translate-y-0.5 hover:shadow-[0_26px_64px_-44px_var(--shadow-color)]",
      isDragging && "opacity-45",
      isSelected && "ring-2 ring-ring/45",
      isOverlay && "w-[18rem]",
    )}
  >
    {detailHref && !isOverlay ? (
      <TrackedLink
        aria-label={`Open ${getCandidateTitle(submission)} detail panel`}
        className="absolute inset-0 z-10 rounded-[1.1rem] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        href={detailHref}
      >
        <span className="sr-only">
          Open {getCandidateTitle(submission)} detail panel
        </span>
      </TrackedLink>
    ) : null}
    <div
      className={cn(
        "absolute bottom-0 left-0 top-0 w-1",
        stageAccentClassMap[submission.stage],
      )}
    />
    <div className="flex items-start justify-between gap-3 pl-1.5">
      <div className="min-w-0">
        <h3 className="truncate text-sm font-semibold text-foreground">
          {getCandidateTitle(submission)}
        </h3>
        <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
          {getCandidateSubtitle(submission)}
        </p>
      </div>
      <div className="relative z-20 flex shrink-0 items-center gap-1.5">
        <PipelineRiskControl
          canUpdate={canChangeStage && !isOverlay}
          riskFlag={submission.riskFlag}
          submissionId={submission.id}
        />
        {dragHandle ? (
          <Button
            aria-label={`Move ${getCandidateTitle(submission)} between pipeline stages`}
            className={dragHandleButtonClassName}
            disabled={dragHandle.disabled}
            ref={dragHandle.setActivatorNodeRef}
            size="icon"
            type="button"
            variant="outline"
            {...dragHandle.attributes}
            {...dragHandle.listeners}
          >
            {isPending ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <GripVertical className="size-3.5" />
            )}
          </Button>
        ) : showDragHandlePreview ? (
          <Button
            asChild
            className={dragHandleButtonClassName}
            size="icon"
            variant="outline"
          >
            <span>
              <GripVertical className="size-3.5" />
            </span>
          </Button>
        ) : null}
      </div>
    </div>

    <div className="mt-3 rounded-[0.9rem] border border-border/60 bg-surface-1/62 px-3 py-2.5">
      <p className="truncate text-sm font-medium text-foreground">
        {getRoleTitle(submission)}
      </p>
      <p className="mt-1 truncate text-xs text-muted-foreground">
        {getClientName(submission)}
      </p>
    </div>

    <PipelineNextStepControl
      canUpdate={canChangeStage && !isOverlay}
      className="relative z-20 mt-3"
      nextStep={submission.nextStep}
      submissionId={submission.id}
    />

    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
      <span className="inline-flex min-w-0 items-center gap-1.5">
        <UserRound className="size-3.5 shrink-0" />
        <span className="truncate">{getOwnerLabel(submission)}</span>
      </span>
      <span className="inline-flex items-center gap-1.5">
        <CalendarClock className="size-3.5" />
        {formatDate(getTouchValue(submission))}
      </span>
    </div>

    <PipelineStageActions
      canChangeStage={canChangeStage}
      className="relative z-20 mt-3 pl-1.5"
      compact
      currentStage={submission.stage}
      submissionId={submission.id}
    />
  </article>
);

const SortableOpportunityCard = ({
  canChangeStage,
  detailHref,
  isPending,
  isSelected,
  submission,
}: {
  canChangeStage: boolean;
  detailHref?: string;
  isPending: boolean;
  isSelected: boolean;
  submission: SubmissionRecord;
}) => {
  const {
    attributes,
    isDragging,
    listeners,
    setActivatorNodeRef,
    setNodeRef,
    transform,
    transition,
  } = useSortable({
    disabled: !canChangeStage || isPending,
    id: submission.id,
  });
  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <OpportunityCard
        canChangeStage={canChangeStage}
        detailHref={detailHref}
        dragHandle={
          canChangeStage
            ? {
                attributes,
                disabled: isPending,
                listeners,
                setActivatorNodeRef,
              }
            : undefined
        }
        isDragging={isDragging}
        isPending={isPending}
        isSelected={isSelected}
        submission={submission}
      />
    </div>
  );
};

const PipelineStageColumn = ({
  canChangeStage,
  children,
  isDropTarget,
  stage,
}: {
  canChangeStage: boolean;
  children: ReactNode;
  isDropTarget: boolean;
  stage: PipelineStageGroup;
}) => {
  const { isOver, setNodeRef } = useDroppable({
    disabled: !canChangeStage,
    id: stage.key,
  });
  const shouldShowDropTarget = isOver || isDropTarget;

  return (
    <section
      ref={setNodeRef}
      className={cn(
        "flex min-h-[26rem] flex-col rounded-[1.25rem] border border-border/70 bg-workspace-muted-surface/45 p-3 transition-[background-color,border-color,box-shadow]",
        // `isOver` is false when the pointer is over a card, so the parent passes
        // `isDropTarget` after resolving that card back to its owning column.
        // Multiple containers also need the column itself to be droppable so empty lanes work:
        // https://dndkit.com/legacy/presets/sortable/overview/
        shouldShowDropTarget &&
          cn(
            "ring-2 ring-inset shadow-[0_24px_72px_-46px_var(--shadow-color)]",
            stageDropTargetClassMap[stage.key],
          ),
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "size-2.5 rounded-full",
                stageAccentClassMap[stage.key],
              )}
            />
            <h2 className="truncate text-sm font-semibold text-foreground">
              {stage.label}
            </h2>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {stage.description}
          </p>
        </div>
        <span className="rounded-full border border-border/70 bg-background/70 px-2 py-0.5 text-xs font-semibold text-muted-foreground">
          {stage.items.length}
        </span>
      </div>

      <div className="mt-3 space-y-3">{children}</div>
    </section>
  );
};

export const PipelineBoardView = ({
  canChangeStage,
  detailHrefs,
  groups,
  selectedSubmissionId,
}: {
  canChangeStage: boolean;
  detailHrefs: Record<string, string>;
  groups: PipelineStageGroup[];
  selectedSubmissionId: string | null;
}) => {
  const router = useRouter();
  const [localGroups, setLocalGroups] = useState(groups);
  const [activeSubmissionId, setActiveSubmissionId] = useState<string | null>(
    null,
  );
  const [pendingSubmissionId, setPendingSubmissionId] = useState<string | null>(
    null,
  );
  const [dragError, setDragError] = useState<string | null>(null);
  const [overStage, setOverStage] = useState<ApiSubmissionStage | null>(null);
  const [, startRefresh] = useTransition();
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 160,
        tolerance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  const activeSubmission = findSubmission(localGroups, activeSubmissionId);
  const stageItemIds = useMemo(
    () =>
      Object.fromEntries(
        localGroups.map((stage) => [
          stage.key,
          stage.items.map((submission) => submission.id),
        ]),
      ) as Record<ApiSubmissionStage, string[]>,
    [localGroups],
  );

  useEffect(() => {
    setLocalGroups(groups);
  }, [groups]);

  return (
    <div className="space-y-3">
      {dragError ? (
        <div className="rounded-[1rem] border border-destructive/25 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {dragError}
        </div>
      ) : null}

      <DndContext
        collisionDetection={pipelineCollisionDetection}
        sensors={sensors}
        onDragCancel={() => {
          setActiveSubmissionId(null);
          setOverStage(null);
        }}
        onDragEnd={(event) => {
          const submissionId = String(event.active.id);
          const sourceStage = getStageKeyForId(localGroups, event.active.id);
          const targetStage = event.over
            ? getStageKeyForId(localGroups, event.over.id)
            : null;

          setActiveSubmissionId(null);
          setOverStage(null);

          if (
            !canChangeStage ||
            !sourceStage ||
            !targetStage ||
            sourceStage === targetStage
          ) {
            return;
          }

          const previousGroups = localGroups;
          setDragError(null);
          setPendingSubmissionId(submissionId);
          setLocalGroups(
            moveSubmissionToStage(previousGroups, submissionId, targetStage),
          );

          void requestSubmissionStageTransition(submissionId, targetStage)
            .then(() => {
              startRefresh(() => {
                router.refresh();
              });
            })
            .catch((error) => {
              if (
                error instanceof Error &&
                error.message === "UNAUTHENTICATED"
              ) {
                router.push("/sign-in");
                return;
              }

              setLocalGroups(previousGroups);
              setDragError(getErrorMessage(error));
            })
            .finally(() => {
              setPendingSubmissionId(null);
            });
        }}
        onDragStart={(event) => {
          if (!canChangeStage) {
            return;
          }

          setDragError(null);
          setActiveSubmissionId(String(event.active.id));
        }}
        onDragOver={(event) => {
          if (!canChangeStage) {
            return;
          }

          // Highlight the whole column even when dnd-kit reports the card under the pointer.
          setOverStage(
            event.over ? getStageKeyForId(localGroups, event.over.id) : null,
          );
        }}
      >
        <div className="overflow-x-auto pb-2">
          <div className="grid w-max grid-cols-[repeat(7,19.5rem)] gap-3">
            {localGroups.map((stage) => (
              <PipelineStageColumn
                key={stage.key}
                canChangeStage={canChangeStage}
                isDropTarget={overStage === stage.key}
                stage={stage}
              >
                <SortableContext
                  items={stageItemIds[stage.key]}
                  strategy={verticalListSortingStrategy}
                >
                  {stage.items.length > 0 ? (
                    stage.items.map((submission) => (
                      <SortableOpportunityCard
                        key={submission.id}
                        canChangeStage={canChangeStage}
                        detailHref={detailHrefs[submission.id]}
                        isPending={pendingSubmissionId === submission.id}
                        isSelected={selectedSubmissionId === submission.id}
                        submission={submission}
                      />
                    ))
                  ) : (
                    <div className="rounded-[1rem] border border-dashed border-border/70 bg-background/42 px-3 py-8 text-center">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                        Clear lane
                      </p>
                      <p className="mt-2 text-sm leading-5 text-muted-foreground">
                        No opportunities are parked here.
                      </p>
                    </div>
                  )}
                </SortableContext>
              </PipelineStageColumn>
            ))}
          </div>
        </div>

        <DragOverlay>
          {activeSubmission ? (
            <OpportunityCard
              canChangeStage={canChangeStage}
              isOverlay
              showDragHandlePreview={canChangeStage}
              submission={activeSubmission}
            />
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
};
