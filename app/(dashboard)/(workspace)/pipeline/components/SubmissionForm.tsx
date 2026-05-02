"use client";

import type { ApiUserReference } from "@recruitflow/contracts";
import { Loader2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import type { ChangeEvent, FormEvent } from "react";
import { useMemo, useState } from "react";

import { TrackedLink } from "@/components/navigation/TrackedLink";
import { Button } from "@/components/ui/Button";

import { SubmissionLaunchSetup } from "./SubmissionLaunchSetup";
import { SubmissionOpportunityPair } from "./SubmissionOpportunityPair";
import { SubmissionReadinessPanel } from "./SubmissionReadinessPanel";
import {
  getMotionTransition,
  MotionStatusMessage,
  quickMotionTransition,
  useReducedMotionFlag,
} from "./utils/submissionFormMotion";
import {
  buildSubmissionFormValues,
  emptySubmissionFormValues,
  getCandidateSelectLabel,
  getJobSelectLabel,
  getLaunchButtonLabel,
  isLaunchableJobStatus,
  type OpportunityPairStatus,
  type OpportunityPanelTone,
  type SubmissionCandidateOption,
  type SubmissionExistingOption,
  type SubmissionFormValues,
  type SubmissionJobOption,
} from "./utils/submissionFormTypes";

export type {
  SubmissionCandidateOption,
  SubmissionExistingOption,
  SubmissionFormValues,
  SubmissionJobOption,
};
export { buildSubmissionFormValues, emptySubmissionFormValues };

type SubmissionFormProps = {
  cancelHref: string;
  candidateOptions: SubmissionCandidateOption[];
  error?: string | null;
  existingSubmissions: SubmissionExistingOption[];
  initialValues: SubmissionFormValues;
  isPending: boolean;
  jobOptions: SubmissionJobOption[];
  onSubmit: (values: SubmissionFormValues) => void;
  ownerOptions: ApiUserReference[];
};

export const SubmissionForm = ({
  cancelHref,
  candidateOptions,
  error,
  existingSubmissions,
  initialValues,
  isPending,
  jobOptions,
  onSubmit,
  ownerOptions,
}: SubmissionFormProps) => {
  const [values, setValues] = useState<SubmissionFormValues>(initialValues);
  const shouldReduceMotion = useReducedMotionFlag();
  const selectedJob = useMemo(
    () => jobOptions.find((job) => job.id === values.jobId),
    [jobOptions, values.jobId],
  );
  const selectedCandidate = useMemo(
    () =>
      candidateOptions.find((candidate) => candidate.id === values.candidateId),
    [candidateOptions, values.candidateId],
  );
  const selectedOwner = useMemo(
    () => ownerOptions.find((owner) => owner.id === values.ownerUserId),
    [ownerOptions, values.ownerUserId],
  );
  const jobSelectOptions = useMemo(
    () =>
      jobOptions.map((job) => ({
        disabled: !isLaunchableJobStatus(job.status),
        label: getJobSelectLabel(job),
        value: job.id,
      })),
    [jobOptions],
  );
  const candidateSelectOptions = useMemo(
    () =>
      candidateOptions.map((candidate) => ({
        label: getCandidateSelectLabel(candidate),
        value: candidate.id,
      })),
    [candidateOptions],
  );
  const ownerSelectOptions = useMemo(
    () =>
      ownerOptions.map((owner) => ({
        label: owner.name ?? owner.email,
        value: owner.id,
      })),
    [ownerOptions],
  );
  const duplicateSubmission = useMemo(
    () =>
      existingSubmissions.find(
        (submission) =>
          submission.jobId === values.jobId &&
          submission.candidateId === values.candidateId,
      ),
    [existingSubmissions, values.candidateId, values.jobId],
  );
  const hasCandidates = candidateOptions.length > 0;
  const hasJobs = jobOptions.length > 0;
  const hasOwners = ownerOptions.length > 0;
  const selectedJobLaunchable = selectedJob
    ? isLaunchableJobStatus(selectedJob.status)
    : false;
  const hasContact = Boolean(
    selectedCandidate?.email || selectedCandidate?.phone,
  );
  const pairStatus: OpportunityPairStatus =
    duplicateSubmission || (selectedJob && !selectedJobLaunchable)
      ? "blocked"
      : selectedCandidate && selectedJob
        ? "ready"
        : selectedCandidate || selectedJob
          ? "partial"
          : "idle";
  const candidatePanelTone: OpportunityPanelTone = selectedCandidate
    ? selectedCandidate.hasResume && hasContact
      ? "ready"
      : "partial"
    : "idle";
  const rolePanelTone: OpportunityPanelTone = selectedJob
    ? selectedJobLaunchable
      ? "ready"
      : "blocked"
    : "idle";
  const canSubmit = Boolean(
    hasCandidates &&
      hasJobs &&
      hasOwners &&
      selectedCandidate &&
      selectedJob &&
      selectedOwner &&
      selectedJobLaunchable &&
      !duplicateSubmission &&
      values.nextStep.trim(),
  );
  const opportunityTitle =
    selectedCandidate && selectedJob
      ? `${selectedCandidate.name} for ${selectedJob.title}${
          selectedJob.clientName ? ` at ${selectedJob.clientName}` : ""
        }`
      : "Choose a candidate and role to launch";

  const updateInputValue =
    (field: keyof SubmissionFormValues) =>
    (
      event: ChangeEvent<
        HTMLSelectElement | HTMLTextAreaElement | HTMLInputElement
      >,
    ) => {
      setValues((currentValues) => ({
        ...currentValues,
        [field]: event.target.value,
      }));
    };
  const updateSelectValue =
    (field: keyof SubmissionFormValues) => (value: string) => {
      setValues((currentValues) => ({
        ...currentValues,
        [field]: value,
      }));
    };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!canSubmit) {
      return;
    }

    onSubmit(values);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <SubmissionOpportunityPair
        candidatePanelTone={candidatePanelTone}
        hasContact={hasContact}
        opportunityTitle={opportunityTitle}
        pairStatus={pairStatus}
        rolePanelTone={rolePanelTone}
        selectedCandidate={selectedCandidate}
        selectedJob={selectedJob}
        selectedJobLaunchable={selectedJobLaunchable}
      />

      <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <SubmissionLaunchSetup
          candidateSelectOptions={candidateSelectOptions}
          hasCandidates={hasCandidates}
          hasJobs={hasJobs}
          hasOwners={hasOwners}
          jobSelectOptions={jobSelectOptions}
          onInputChange={updateInputValue}
          onSelectChange={updateSelectValue}
          ownerSelectOptions={ownerSelectOptions}
          values={values}
        />

        <SubmissionReadinessPanel
          duplicateSubmission={duplicateSubmission}
          hasContact={hasContact}
          selectedCandidate={selectedCandidate}
          selectedJob={selectedJob}
          selectedJobLaunchable={selectedJobLaunchable}
          selectedOwner={selectedOwner}
        />
      </section>

      <AnimatePresence initial={false}>
        {error ? (
          <MotionStatusMessage
            key="submission-error"
            className="status-message status-error"
          >
            {error}
          </MotionStatusMessage>
        ) : null}
      </AnimatePresence>

      <AnimatePresence initial={false}>
        {!hasCandidates || !hasJobs || !hasOwners ? (
          <MotionStatusMessage
            key="launch-prerequisites"
            className="status-message border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"
          >
            Launch needs at least one job, one candidate, and one workspace
            member owner.
          </MotionStatusMessage>
        ) : null}
      </AnimatePresence>

      <div className="flex flex-wrap items-center gap-3">
        <motion.div
          animate={{
            scale: canSubmit && !shouldReduceMotion ? 1.012 : 1,
            y: canSubmit && !shouldReduceMotion ? -1 : 0,
          }}
          transition={getMotionTransition(
            shouldReduceMotion,
            quickMotionTransition,
          )}
          className="max-w-full"
        >
          <Button
            type="submit"
            className="max-w-full rounded-full"
            disabled={isPending || !canSubmit}
          >
            {isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Launching...
              </>
            ) : (
              getLaunchButtonLabel(selectedCandidate, selectedJob)
            )}
          </Button>
        </motion.div>
        <Button
          asChild
          type="button"
          variant="outline"
          className="rounded-full"
        >
          <TrackedLink href={cancelHref}>Cancel</TrackedLink>
        </Button>
      </div>
    </form>
  );
};
