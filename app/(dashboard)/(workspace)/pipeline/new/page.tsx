import { redirect } from "next/navigation";

import type {
  CandidatesListResponse,
  CurrentMembershipResponse,
  JobsListResponse,
  SubmissionsListResponse,
} from "@recruitflow/contracts";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { WorkspacePageHeader } from "@/components/workspace/WorkspacePageHeader";
import { isApiRequestError, requestApiJson } from "@/lib/api/client";

import {
  type SubmissionCandidateOption,
  type SubmissionExistingOption,
  type SubmissionFormValues,
  type SubmissionJobOption,
} from "../components/SubmissionForm";
import { SubmissionFormController } from "../components/SubmissionFormController";

type PageProps = {
  searchParams?:
    | Promise<Record<string, string | string[] | undefined>>
    | Record<string, string | string[] | undefined>;
};

type RedirectTarget = "candidate" | "job" | "pipeline";

const getSingleParamValue = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

const parseRedirectTarget = (
  value: string | string[] | undefined,
): RedirectTarget => {
  const target = getSingleParamValue(value);

  return target === "candidate" || target === "job" ? target : "pipeline";
};

const getCreateSubmissionContext = async () => {
  try {
    const [jobsList, candidatesList, membership, submissionsList] =
      await Promise.all([
        requestApiJson<JobsListResponse>("/jobs?pageSize=100"),
        requestApiJson<CandidatesListResponse>("/candidates?pageSize=100"),
        requestApiJson<CurrentMembershipResponse>("/memberships/current"),
        requestApiJson<SubmissionsListResponse>("/submissions?pageSize=100"),
      ]);

    return {
      candidatesList,
      jobsList,
      membership,
      submissionsList,
    };
  } catch (error) {
    if (isApiRequestError(error) && error.status === 401) {
      redirect("/sign-in");
    }

    throw error;
  }
};

const getCancelHref = (
  redirectTarget: RedirectTarget,
  jobId: string,
  candidateId: string,
) => {
  if (redirectTarget === "job" && jobId) {
    return `/jobs/${jobId}`;
  }

  if (redirectTarget === "candidate" && candidateId) {
    return `/candidates/${candidateId}`;
  }

  return "/pipeline";
};

const NewSubmissionPage = async ({ searchParams }: PageProps) => {
  const params = await Promise.resolve(searchParams ?? {});
  const requestedJobId = getSingleParamValue(params.jobId) ?? "";
  const requestedCandidateId = getSingleParamValue(params.candidateId) ?? "";
  const redirectTarget = parseRedirectTarget(params.returnTo);
  const { candidatesList, jobsList, membership, submissionsList } =
    await getCreateSubmissionContext();
  const jobOptions: SubmissionJobOption[] = jobsList.items.map((job) => ({
    clientName: job.client?.name ?? null,
    id: job.id,
    ownerUserId: job.ownerUserId,
    status: job.status,
    title: job.title,
  }));
  const candidateOptions: SubmissionCandidateOption[] =
    candidatesList.items.map((candidate) => ({
      currentCompany: candidate.currentCompany,
      currentTitle: candidate.currentTitle,
      email: candidate.email,
      hasResume: candidate.hasResume,
      headline: candidate.headline,
      id: candidate.id,
      name: candidate.fullName,
      ownerUserId: candidate.ownerUserId,
      phone: candidate.phone,
    }));
  const existingSubmissions: SubmissionExistingOption[] =
    submissionsList.items.map((submission) => ({
      candidateId: submission.candidateId,
      id: submission.id,
      jobId: submission.jobId,
      nextStep: submission.nextStep,
      stage: submission.stage,
    }));
  const initialJob = jobsList.items.find((job) => job.id === requestedJobId);
  const initialCandidate = candidatesList.items.find(
    (candidate) => candidate.id === requestedCandidateId,
  );
  const ownerOptions = jobsList.ownerOptions.length
    ? jobsList.ownerOptions
    : candidatesList.ownerOptions;
  const initialOwnerUserId = ownerOptions.some(
    (owner) => owner.id === membership.userId,
  )
    ? membership.userId
    : initialJob?.ownerUserId ||
      initialCandidate?.ownerUserId ||
      ownerOptions[0]?.id ||
      "";
  const initialJobId = jobsList.items.some((job) => job.id === requestedJobId)
    ? requestedJobId
    : "";
  const initialCandidateId = candidateOptions.some(
    (candidate) => candidate.id === requestedCandidateId,
  )
    ? requestedCandidateId
    : "";
  const initialValues: SubmissionFormValues = {
    candidateId: initialCandidateId,
    jobId: initialJobId,
    nextStep: "",
    ownerUserId: initialOwnerUserId,
    riskFlag: "none",
    stage: "sourced",
  };

  return (
    <section className="space-y-6 px-0 py-1 lg:py-2">
      <WorkspacePageHeader
        kicker="Pipeline launch"
        title="Launch opportunity"
        description="Start a trackable candidate-role opportunity with owner, risk, stage, and next action already in place."
      />

      {membership.role === "coordinator" ? (
        <Card className="max-w-4xl">
          <CardHeader>
            <CardTitle>Launch opportunity is restricted</CardTitle>
            <CardDescription>
              Coordinators can inspect pipeline state, but owners and recruiters
              launch candidate-role opportunities.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="status-message border-border/70 bg-surface-1/70 text-muted-foreground">
              The API enforces the same restriction, so hidden UI cannot bypass
              submission ownership rules.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="max-w-6xl">
          <SubmissionFormController
            cancelHref={getCancelHref(
              redirectTarget,
              initialJobId,
              initialCandidateId,
            )}
            candidateOptions={candidateOptions}
            existingSubmissions={existingSubmissions}
            initialValues={initialValues}
            jobOptions={jobOptions}
            ownerOptions={ownerOptions}
            redirectTarget={redirectTarget}
          />
        </div>
      )}
    </section>
  );
};

export default NewSubmissionPage;
