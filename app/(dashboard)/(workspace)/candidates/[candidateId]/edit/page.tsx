import { notFound, redirect } from "next/navigation";

import type { CandidateDetailResponse } from "@recruitflow/contracts";

import { TrackedLink } from "@/components/navigation/TrackedLink";
import { Button } from "@/components/ui/Button";
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
  buildCandidateFormValues,
} from "../../components/candidateFormValues";
import { CandidateFormController } from "../../components/CandidateFormController";

type PageProps = {
  params: Promise<{
    candidateId: string;
  }>;
  searchParams?:
    | Promise<Record<string, string | string[] | undefined>>
    | Record<string, string | string[] | undefined>;
};

const getCandidateForEdit = async (candidateId: string) => {
  try {
    return await requestApiJson<CandidateDetailResponse>(
      `/candidates/${candidateId}`,
    );
  } catch (error) {
    if (isApiRequestError(error)) {
      if (error.status === 401) {
        redirect("/sign-in");
      }

      if (error.status === 404) {
        notFound();
      }
    }

    throw error;
  }
};

const hasCreatedFlag = (
  params: Record<string, string | string[] | undefined>,
) => {
  const created = params.created;

  return Array.isArray(created) ? created[0] === "1" : created === "1";
};

const EditCandidatePage = async ({ params, searchParams }: PageProps) => {
  const { candidateId } = await params;
  const urlParams = await Promise.resolve(searchParams ?? {});
  const { candidate, ownerOptions } = await getCandidateForEdit(candidateId);

  return (
    <section className="space-y-6 px-0 py-1 lg:py-2">
      <WorkspacePageHeader
        kicker="Candidate maintenance"
        title={`Edit ${candidate.fullName}`}
        description="Keep owner, source, contact details, skills, and location current before downstream submissions and documents attach to this profile."
      />

      {hasCreatedFlag(urlParams) ? (
        <p className="status-message status-success">
          Candidate created. You can keep editing here or return to the
          candidate inventory.
          <Button
            asChild
            size="sm"
            variant="outline"
            className="ml-2 rounded-full"
          >
            <TrackedLink href="/candidates">Back to candidates</TrackedLink>
          </Button>
        </p>
      ) : null}

      <Card className="max-w-5xl">
        <CardHeader>
          <CardTitle>Candidate profile baseline</CardTitle>
          <CardDescription>
            These fields remain intentionally profile-focused. Candidate detail,
            document upload, and submission history are owned by later stories.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CandidateFormController
            candidateId={candidate.id}
            initialValues={buildCandidateFormValues({
              currentCompany: candidate.currentCompany ?? "",
              currentTitle: candidate.currentTitle ?? "",
              email: candidate.email ?? "",
              fullName: candidate.fullName,
              headline: candidate.headline ?? "",
              linkedinUrl: candidate.linkedinUrl ?? "",
              location: candidate.location ?? "",
              noticePeriod: candidate.noticePeriod ?? "",
              ownerUserId: candidate.ownerUserId ?? ownerOptions[0]?.id ?? "",
              phone: candidate.phone ?? "",
              portfolioUrl: candidate.portfolioUrl ?? "",
              salaryExpectation: candidate.salaryExpectation ?? "",
              skillsText: candidate.skillsText ?? "",
              source: candidate.source ?? "",
            })}
            mode="edit"
            ownerOptions={ownerOptions}
          />
        </CardContent>
      </Card>
    </section>
  );
};

export default EditCandidatePage;
