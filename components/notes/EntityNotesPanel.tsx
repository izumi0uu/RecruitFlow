"use client";

import {
  type ApiNoteEntityType,
  type NoteMutationResponse,
  type NoteRecord,
  noteMutationRequestSchema,
} from "@recruitflow/contracts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Clock3,
  Loader2,
  MessageSquareText,
  RotateCcw,
  Send,
  ShieldCheck,
  Sparkles,
  StickyNote,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useRouter } from "next/navigation";
import { useId, useMemo, useState } from "react";

import { Avatar, AvatarFallback } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { isApiRequestError } from "@/lib/api/errors";
import { fetchJson } from "@/lib/query/fetcher";
import {
  activityTimelineRootQueryKey,
  notesListQueryOptions,
  notesListRootQueryKey,
} from "@/lib/query/options";
import { cn } from "@/lib/utils";

type EntityNoteTarget = {
  entityId: string;
  entityType: ApiNoteEntityType;
  label: string;
  secondaryLabel?: string | null;
};

type EntityNotesPanelProps = {
  canCreateNote?: boolean;
  className?: string;
  description?: string;
  entity: EntityNoteTarget;
  pageSize?: number;
  title?: string;
};

const maxNoteLength = 4000;

const noteMotionTransition = {
  duration: 0.22,
  ease: [0.22, 1, 0.36, 1],
} as const;

const instantMotionTransition = { duration: 0 } as const;

const getTransition = (shouldReduceMotion: boolean) =>
  shouldReduceMotion ? instantMotionTransition : noteMotionTransition;

const entityTypeLabelMap: Record<ApiNoteEntityType, string> = {
  candidate: "Candidate",
  client: "Client",
  job: "Job",
  submission: "Submission",
};

const formatNoteTime = (value: string) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Time pending";
  }

  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    month: "short",
  }).format(date);
};

const getActorLabel = (note: NoteRecord) =>
  note.createdBy?.name ?? note.createdBy?.email ?? "System";

const getActorInitials = (note: NoteRecord) => {
  const label = getActorLabel(note);
  const parts = label.replace(/@.*/, "").split(/\s+/).filter(Boolean);

  if (parts.length === 0) {
    return "RF";
  }

  return parts
    .slice(0, 2)
    .map((part) => part[0])
    .join("");
};

const EntityNoteRow = ({ note }: { note: NoteRecord }) => (
  <motion.li
    layout
    initial={{ opacity: 0, y: 6 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -6 }}
    transition={noteMotionTransition}
    className="rounded-[1.1rem] border border-border/70 bg-surface-1/68 p-3"
  >
    <div className="flex items-start gap-3">
      <Avatar className="size-8">
        <AvatarFallback>{getActorInitials(note)}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <p className="truncate text-sm font-semibold text-foreground">
            {getActorLabel(note)}
          </p>
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock3 className="size-3.5" />
            {formatNoteTime(note.createdAt)}
          </span>
        </div>
        <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-foreground/88">
          {note.body}
        </p>
      </div>
    </div>
  </motion.li>
);

const EntityNotesPanel = ({
  canCreateNote = true,
  className,
  description = "Workspace-visible notes linked to this record for handoff, feedback, and team memory.",
  entity,
  pageSize = 8,
  title = "Notes",
}: EntityNotesPanelProps) => {
  const [body, setBody] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const textareaId = useId();
  const router = useRouter();
  const queryClient = useQueryClient();
  const shouldReduceMotion = useReducedMotion() ?? false;
  const transition = getTransition(shouldReduceMotion);
  const query = useMemo(
    () => ({
      entityId: entity.entityId,
      entityType: entity.entityType,
      page: 1,
      pageSize,
    }),
    [entity.entityId, entity.entityType, pageSize],
  );
  const {
    data: notesList,
    error,
    isError,
    isFetching,
    refetch,
  } = useQuery(notesListQueryOptions(query));
  const items = notesList?.items ?? [];
  const totalItems = notesList?.pagination.totalItems ?? 0;
  const trimmedBody = body.trim();
  const remainingCharacters = maxNoteLength - body.length;
  const isEmpty = !isFetching && items.length === 0 && !isError;
  const mutation = useMutation({
    mutationFn: async (nextBody: string) => {
      const parsedPayload = noteMutationRequestSchema.safeParse({
        body: nextBody,
        entityId: entity.entityId,
        entityType: entity.entityType,
      });

      if (!parsedPayload.success) {
        throw new Error(
          parsedPayload.error.issues[0]?.message ?? "Invalid note payload",
        );
      }

      return fetchJson<NoteMutationResponse>("/api/notes", {
        body: JSON.stringify(parsedPayload.data),
        headers: {
          accept: "application/json",
          "content-type": "application/json",
        },
        method: "POST",
      });
    },
    onMutate: () => {
      setSubmitError(null);
    },
    onSuccess: async () => {
      setBody("");
      queryClient.removeQueries({
        queryKey: notesListRootQueryKey,
        type: "inactive",
      });
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: notesListRootQueryKey,
          refetchType: "active",
        }),
        queryClient.invalidateQueries({
          queryKey: activityTimelineRootQueryKey,
          refetchType: "active",
        }),
      ]);
    },
    onError: (mutationError) => {
      if (isApiRequestError(mutationError) && mutationError.status === 401) {
        router.push("/sign-in");
        return;
      }

      setSubmitError(
        mutationError instanceof Error
          ? mutationError.message
          : "Unable to add note.",
      );
    },
  });

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <CardTitle className="flex items-center gap-2">
              <StickyNote className="size-4" />
              {title}
            </CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
            <ShieldCheck className="size-3.5" />
            Workspace
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <form
          className="rounded-[1.15rem] border border-border/70 bg-workspace-muted-surface/52 p-2"
          onSubmit={(event) => {
            event.preventDefault();

            if (!trimmedBody || mutation.isPending || !canCreateNote) {
              return;
            }

            mutation.mutate(body);
          }}
        >
          <label className="sr-only" htmlFor={textareaId}>
            Add note
          </label>
          <textarea
            id={textareaId}
            className="input min-h-28 resize-y border-transparent bg-background/82 py-3 shadow-none"
            disabled={!canCreateNote || mutation.isPending}
            maxLength={maxNoteLength}
            placeholder={`Add context for ${entity.label}`}
            value={body}
            onChange={(event) => {
              setBody(event.target.value);
              setSubmitError(null);
            }}
          />
          <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <span className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-border/70 bg-background/72 px-2.5 py-1 text-xs font-medium text-muted-foreground">
                <MessageSquareText className="size-3.5" />
                <span className="truncate">
                  {entityTypeLabelMap[entity.entityType]} · {entity.label}
                </span>
              </span>
              <span
                className={cn(
                  "text-xs tabular-nums text-muted-foreground",
                  remainingCharacters < 200 && "text-amber-600",
                )}
              >
                {remainingCharacters}
              </span>
            </div>
            <Button
              className="rounded-full"
              disabled={!trimmedBody || !canCreateNote || mutation.isPending}
              size="sm"
              type="submit"
            >
              {mutation.isPending ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Send className="size-3.5" />
              )}
              Add note
            </Button>
          </div>
        </form>

        {!canCreateNote ? (
          <p className="status-message border-border/70 bg-surface-1/70 text-muted-foreground">
            Note entry unavailable for this record.
          </p>
        ) : null}

        {submitError ? (
          <p className="status-message status-error">{submitError}</p>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-surface-1/70 px-2.5 py-1 text-xs font-medium text-muted-foreground">
            <Sparkles className="size-3.5" />
            Latest {items.length} of {totalItems}
          </span>
          {isFetching && items.length > 0 ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" />
              Syncing
            </span>
          ) : null}
        </div>

        {isError ? (
          <div className="rounded-[1.1rem] border border-destructive/30 bg-destructive/10 p-4">
            <p className="text-sm font-medium text-foreground">
              Unable to load notes.
            </p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              {error instanceof Error
                ? error.message
                : "The notes API returned an unexpected error."}
            </p>
            <Button
              className="mt-3 rounded-full"
              size="sm"
              type="button"
              variant="outline"
              onClick={() => {
                void refetch();
              }}
            >
              <RotateCcw className="size-3.5" />
              Retry
            </Button>
          </div>
        ) : null}

        <AnimatePresence mode="popLayout">
          {isFetching && items.length === 0 ? (
            <motion.div
              key="loading"
              initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={transition}
              className="flex min-h-28 items-center justify-center rounded-[1.1rem] border border-border/70 bg-surface-1/60"
            >
              <Loader2 className="size-4 animate-spin text-muted-foreground" />
            </motion.div>
          ) : null}

          {isEmpty ? (
            <motion.div
              key="empty"
              initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={transition}
              className="rounded-[1.1rem] border border-dashed border-border bg-surface-1/60 p-5"
            >
              <p className="text-sm font-medium text-foreground">
                No notes yet.
              </p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Add the first workspace-visible note and it will appear here and
                in the activity timeline.
              </p>
            </motion.div>
          ) : null}

          {items.length > 0 ? (
            <motion.ul
              key="notes"
              layout
              transition={transition}
              className="space-y-2"
            >
              <AnimatePresence mode="popLayout">
                {items.map((note) => (
                  <EntityNoteRow key={note.id} note={note} />
                ))}
              </AnimatePresence>
            </motion.ul>
          ) : null}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
};

export { EntityNotesPanel };
