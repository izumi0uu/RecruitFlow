"use client";

import {
  ArrowRight,
  BriefcaseBusiness,
  ShieldAlert,
  UserRound,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import {
  getMotionTransition,
  opportunityPanelIconToneClassMap,
  opportunityPanelToneClassMap,
  pairArrowProgressMap,
  pairArrowToneClassMap,
  useReducedMotionFlag,
} from "./utils/submissionFormMotion";
import {
  getCandidateFocus,
  type OpportunityPairStatus,
  type OpportunityPanelTone,
  type SubmissionCandidateOption,
  type SubmissionJobOption,
} from "./utils/submissionFormTypes";

const OpportunityPreviewPanel = ({
  children,
  icon,
  label,
  tone,
  title,
}: {
  children: ReactNode;
  icon: ReactNode;
  label: string;
  tone: OpportunityPanelTone;
  title: string;
}) => {
  const shouldReduceMotion = useReducedMotionFlag();
  const transition = getMotionTransition(shouldReduceMotion);

  return (
    <motion.div
      layout
      initial={false}
      animate={{
        opacity: 1,
        scale: tone === "idle" || shouldReduceMotion ? 1 : 1.006,
        y: 0,
      }}
      whileHover={shouldReduceMotion ? undefined : { y: -2 }}
      transition={transition}
      className={cn(
        "min-w-0 rounded-[1.35rem] border p-4 transition-colors",
        opportunityPanelToneClassMap[tone],
      )}
    >
      <div className="flex items-start gap-3">
        <motion.span
          layout
          transition={transition}
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-[1rem] border transition-colors",
            opportunityPanelIconToneClassMap[tone],
          )}
        >
          {icon}
        </motion.span>
        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {label}
          </p>
          <AnimatePresence initial={false} mode="wait">
            <motion.div
              key={`${label}-${title}`}
              initial={
                shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 4 }
              }
              animate={{ opacity: 1, y: 0 }}
              exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -4 }}
              transition={transition}
              className="min-w-0"
            >
              <p className="truncate text-sm font-semibold text-foreground">
                {title}
              </p>
              <div className="text-xs leading-5 text-muted-foreground">
                {children}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
};

const OpportunityPairArrow = ({
  status,
}: {
  status: OpportunityPairStatus;
}) => {
  const shouldReduceMotion = useReducedMotionFlag();
  const transition = getMotionTransition(shouldReduceMotion);
  const progress = pairArrowProgressMap[status];

  return (
    <motion.div
      layout
      className="hidden items-center justify-center text-muted-foreground lg:flex"
      transition={transition}
    >
      <motion.span
        aria-hidden="true"
        animate={{
          scale: shouldReduceMotion || status === "idle" ? 1 : 1.04,
        }}
        transition={transition}
        className={cn(
          "relative flex size-12 items-center justify-center overflow-hidden rounded-full border transition-colors",
          pairArrowToneClassMap[status],
        )}
      >
        <span className="absolute inset-1 overflow-hidden rounded-full">
          <motion.span
            className="absolute inset-0 bg-current/14"
            initial={false}
            animate={{
              opacity: progress === 0 ? 0 : 1,
              scaleX: progress,
            }}
            style={{ originX: 0 }}
            transition={transition}
          />
        </span>
        <motion.span
          className="relative z-10 flex size-7 items-center justify-center"
          initial={false}
          animate={{ x: 0 }}
          transition={transition}
        >
          <ArrowRight className="size-4" />
        </motion.span>
      </motion.span>
    </motion.div>
  );
};

export const SubmissionOpportunityPair = ({
  candidatePanelTone,
  hasContact,
  opportunityTitle,
  pairStatus,
  rolePanelTone,
  selectedCandidate,
  selectedJob,
  selectedJobLaunchable,
}: {
  candidatePanelTone: OpportunityPanelTone;
  hasContact: boolean;
  opportunityTitle: string;
  pairStatus: OpportunityPairStatus;
  rolePanelTone: OpportunityPanelTone;
  selectedCandidate: SubmissionCandidateOption | undefined;
  selectedJob: SubmissionJobOption | undefined;
  selectedJobLaunchable: boolean;
}) => {
  const shouldReduceMotion = useReducedMotionFlag();
  const motionTransition = getMotionTransition(shouldReduceMotion);

  return (
    <motion.section
      layout
      initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={motionTransition}
      className="rounded-[1.75rem] border border-border/70 bg-background/58 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] sm:p-5"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Opportunity pair
          </p>
          <h2 className="text-xl font-semibold tracking-normal text-foreground sm:text-2xl">
            {opportunityTitle}
          </h2>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
            Launch creates the trackable candidate-role opportunity that the
            pipeline, follow-up, risk, and stage movement will operate on.
          </p>
        </div>
        <motion.div
          layout
          transition={motionTransition}
          className="flex shrink-0 items-center gap-2 rounded-full border border-border/70 bg-surface-1/75 px-3 py-2 text-xs font-semibold text-muted-foreground"
        >
          <ShieldAlert className="size-4" />
          API-owned duplicate guard
        </motion.div>
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:items-stretch">
        <OpportunityPreviewPanel
          icon={<UserRound className="size-4" />}
          label="Candidate"
          tone={candidatePanelTone}
          title={selectedCandidate?.name ?? "Select candidate"}
        >
          {selectedCandidate ? (
            <>
              <p className="truncate">{getCandidateFocus(selectedCandidate)}</p>
              <p className="mt-1">
                {selectedCandidate.hasResume
                  ? "Resume ready"
                  : "Resume missing"}
                {" / "}
                {hasContact ? "Contact ready" : "Contact missing"}
              </p>
            </>
          ) : (
            "Pick the person you want to move into the pipeline."
          )}
        </OpportunityPreviewPanel>

        <OpportunityPairArrow status={pairStatus} />

        <OpportunityPreviewPanel
          icon={<BriefcaseBusiness className="size-4" />}
          label="Role"
          tone={rolePanelTone}
          title={selectedJob?.title ?? "Select role"}
        >
          {selectedJob ? (
            <>
              <p className="truncate">
                {selectedJob.clientName ?? "Client context missing"}
              </p>
              <p className="mt-1">
                {selectedJobLaunchable
                  ? "Launchable role"
                  : "Closed and filled roles cannot receive new submissions"}
              </p>
            </>
          ) : (
            "Pick the client role this candidate should be tracked against."
          )}
        </OpportunityPreviewPanel>
      </div>
    </motion.section>
  );
};
