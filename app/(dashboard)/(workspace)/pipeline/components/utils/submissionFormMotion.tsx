"use client";

import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

import type {
  OpportunityPairStatus,
  OpportunityPanelTone,
  ReadinessTone,
} from "./submissionFormTypes";

export const readinessToneClassMap: Record<ReadinessTone, string> = {
  attention:
    "border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-200",
  blocked: "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300",
  ready:
    "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
};

export const opportunityPanelToneClassMap: Record<
  OpportunityPanelTone,
  string
> = {
  blocked:
    "border-rose-500/30 bg-rose-500/10 shadow-[0_24px_70px_-56px_rgba(225,29,72,0.7)]",
  idle: "border-border/70 bg-surface-1/70",
  partial:
    "border-sky-500/30 bg-sky-500/10 shadow-[0_24px_70px_-56px_rgba(2,132,199,0.7)]",
  ready:
    "border-emerald-500/30 bg-emerald-500/10 shadow-[0_24px_70px_-56px_rgba(5,150,105,0.7)]",
};

export const opportunityPanelIconToneClassMap: Record<
  OpportunityPanelTone,
  string
> = {
  blocked: "border-rose-500/25 bg-rose-500/10 text-rose-700 dark:text-rose-300",
  idle: "border-border/70 bg-background/72 text-foreground",
  partial: "border-sky-500/25 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  ready:
    "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
};

export const pairArrowToneClassMap: Record<OpportunityPairStatus, string> = {
  blocked: "border-rose-500/35 bg-rose-500/10 text-rose-700 dark:text-rose-300",
  idle: "border-border/70 bg-surface-1/75 text-muted-foreground",
  partial: "border-sky-500/35 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  ready:
    "border-emerald-500/35 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
};

export const pairArrowProgressMap: Record<OpportunityPairStatus, number> = {
  blocked: 1,
  idle: 0,
  partial: 0.48,
  ready: 1,
};

export const subtleMotionTransition = {
  duration: 0.34,
  ease: [0.22, 1, 0.36, 1],
} as const;

export const quickMotionTransition = {
  duration: 0.22,
  ease: [0.22, 1, 0.36, 1],
} as const;

const instantMotionTransition = { duration: 0 } as const;

export const getMotionTransition = (
  shouldReduceMotion: boolean,
  transition:
    | typeof subtleMotionTransition
    | typeof quickMotionTransition = subtleMotionTransition,
) => (shouldReduceMotion ? instantMotionTransition : transition);

export const useReducedMotionFlag = () => useReducedMotion() ?? false;

export const ReadinessItem = ({
  children,
  motionKey,
  tone,
}: {
  children: ReactNode;
  motionKey: string;
  tone: ReadinessTone;
}) => {
  const Icon = tone === "ready" ? CheckCircle2 : AlertTriangle;
  const shouldReduceMotion = useReducedMotionFlag();
  const transition = getMotionTransition(
    shouldReduceMotion,
    quickMotionTransition,
  );

  return (
    <motion.li
      layout
      initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={transition}
      className={cn(
        "flex items-start gap-2 rounded-[1rem] border px-3 py-2.5 text-sm leading-5 transition-colors",
        readinessToneClassMap[tone],
      )}
    >
      <Icon className="mt-0.5 size-4 shrink-0" />
      <AnimatePresence initial={false} mode="wait">
        <motion.span
          key={motionKey}
          initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 3 }}
          animate={{ opacity: 1, y: 0 }}
          exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -3 }}
          transition={transition}
          className="min-w-0"
        >
          {children}
        </motion.span>
      </AnimatePresence>
    </motion.li>
  );
};

export const MotionStatusMessage = ({
  children,
  className,
}: {
  children: ReactNode;
  className: string;
}) => {
  const shouldReduceMotion = useReducedMotionFlag();
  const transition = getMotionTransition(
    shouldReduceMotion,
    quickMotionTransition,
  );

  return (
    <motion.p
      initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -4 }}
      transition={transition}
      className={className}
    >
      {children}
    </motion.p>
  );
};
