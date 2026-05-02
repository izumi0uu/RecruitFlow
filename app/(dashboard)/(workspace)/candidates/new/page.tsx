import type {
  CandidatesListResponse,
  CurrentMembershipResponse,
} from "@recruitflow/contracts";
import { redirect } from "next/navigation";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { WorkspacePageHeader } from "@/components/workspace/WorkspacePageHeader";
import { isApiRequestError, requestApiJson } from "@/lib/api/client";
import { CandidateFormController } from "../components/CandidateFormController";
import {
  buildCandidateFormValues,
  emptyCandidateFormValues,
} from "../components/candidateFormValues";

const getCreateCandidateContext = async () => {
  try {
    const [candidatesList, membership] = await Promise.all([
      requestApiJson<CandidatesListResponse>("/candidates?pageSize=1"),
      requestApiJson<CurrentMembershipResponse>("/memberships/current"),
    ]);

    return {
      membership,
      ownerOptions: candidatesList.ownerOptions,
    };
  } catch (error) {
    if (isApiRequestError(error) && error.status === 401) {
      redirect("/sign-in");
    }

    throw error;
  }
};

const NewCandidatePage = async () => {
  const { membership, ownerOptions } = await getCreateCandidateContext();
  const initialOwnerUserId = ownerOptions.some(
    (owner) => owner.id === membership.userId,
  )
    ? membership.userId
    : (ownerOptions[0]?.id ?? "");

  return (
    <section className="space-y-6 px-0 py-1 lg:py-2">
      <WorkspacePageHeader
        kicker="New candidate"
        title="Create candidate"
        description="Capture the candidate profile baseline that submissions, resume metadata, and future AI summaries will reuse."
      />

      <Card className="w-full">
        <CardHeader>
          <CardTitle>Candidate profile baseline</CardTitle>
          <CardDescription>
            The API validates owner membership and source before writing the
            candidate record and audit trail.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CandidateFormController
            initialValues={buildCandidateFormValues({
              ...emptyCandidateFormValues,
              ownerUserId: initialOwnerUserId,
            })}
            mode="create"
            ownerOptions={ownerOptions}
          />
        </CardContent>
      </Card>
    </section>
  );
};

export default NewCandidatePage;
