"use client";

import { motion } from "motion/react";

import { TrackedLink } from "@/components/navigation/TrackedLink";
import {
  getMotionTransition,
  ReadinessItem,
  useReducedMotionFlag,
} from "./utils/submissionFormMotion";
import {
  getOwnerLabel,
  type SubmissionCandidateOption,
  type SubmissionExistingOption,
  type SubmissionJobOption,
} from "./utils/submissionFormTypes";

export const SubmissionReadinessPanel = ({
  duplicateSubmission,
  hasContact,
  selectedCandidate,
  selectedJob,
  selectedJobLaunchable,
  selectedOwner,
}: {
  duplicateSubmission: SubmissionExistingOption | undefined;
  hasContact: boolean;
  selectedCandidate: SubmissionCandidateOption | undefined;
  selectedJob: SubmissionJobOption | undefined;
  selectedJobLaunchable: boolean;
  selectedOwner:
    | {
        email: string;
        id: string;
        name: string | null;
      }
    | undefined;
}) => {
  const shouldReduceMotion = useReducedMotionFlag();
  const motionTransition = getMotionTransition(shouldReduceMotion);

  return (
    <aside className="rounded-[1.75rem] border border-border/70 bg-background/58 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] sm:p-5">
      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Readiness
        </p>
        <h3 className="text-base font-semibold text-foreground">
          Launch guard
        </h3>
      </div>

      <motion.ul
        layout
        className="mt-5 space-y-2"
        transition={motionTransition}
      >
        <ReadinessItem
          motionKey={`role-${selectedJob?.id ?? "empty"}-${selectedJobLaunchable ? "ready" : "blocked"}`}
          tone={
            selectedJob
              ? selectedJobLaunchable
                ? "ready"
                : "blocked"
              : "attention"
          }
        >
          {selectedJob
            ? selectedJobLaunchable
              ? "Role is open for launch."
              : "Role is not launchable."
            : "Select a role."}
        </ReadinessItem>
        <ReadinessItem
          motionKey={`resume-${selectedCandidate?.id ?? "empty"}-${selectedCandidate?.hasResume ? "ready" : "missing"}`}
          tone={
            selectedCandidate
              ? selectedCandidate.hasResume
                ? "ready"
                : "attention"
              : "attention"
          }
        >
          {selectedCandidate
            ? selectedCandidate.hasResume
              ? "Candidate resume is ready."
              : "Resume is missing."
            : "Select a candidate."}
        </ReadinessItem>
        <ReadinessItem
          motionKey={`contact-${selectedCandidate?.id ?? "empty"}-${hasContact ? "ready" : "missing"}`}
          tone={
            selectedCandidate
              ? hasContact
                ? "ready"
                : "attention"
              : "attention"
          }
        >
          {selectedCandidate
            ? hasContact
              ? "Candidate contact is available."
              : "Candidate contact is missing."
            : "Contact readiness appears after candidate selection."}
        </ReadinessItem>
        <ReadinessItem
          motionKey={`client-${selectedJob?.id ?? "empty"}-${selectedJob?.clientName ?? "missing"}`}
          tone={selectedJob?.clientName ? "ready" : "attention"}
        >
          {selectedJob?.clientName
            ? "Client context is attached."
            : "Client context is missing or pending."}
        </ReadinessItem>
        <ReadinessItem
          motionKey={`owner-${selectedOwner?.id ?? "empty"}`}
          tone={selectedOwner ? "ready" : "attention"}
        >
          {selectedOwner
            ? `${getOwnerLabel(selectedOwner)} owns this opportunity.`
            : "Select an opportunity owner."}
        </ReadinessItem>
        <ReadinessItem
          motionKey={`duplicate-${duplicateSubmission?.id ?? "none"}-${selectedJob?.id ?? "empty"}-${selectedCandidate?.id ?? "empty"}`}
          tone={
            duplicateSubmission
              ? "blocked"
              : selectedCandidate && selectedJob
                ? "ready"
                : "attention"
          }
        >
          {duplicateSubmission ? (
            <>
              Already in pipeline.{" "}
              <TrackedLink
                className="font-semibold underline underline-offset-4"
                href={`/pipeline?jobId=${duplicateSubmission.jobId}&stage=${duplicateSubmission.stage}`}
              >
                View matching opportunity
              </TrackedLink>
              .
            </>
          ) : selectedCandidate && selectedJob ? (
            "No duplicate found in the loaded pipeline set."
          ) : (
            "Duplicate guard activates after role and candidate are selected."
          )}
        </ReadinessItem>
      </motion.ul>
    </aside>
  );
};
