import { redirect } from "next/navigation";

import type {
  CurrentMembershipResponse,
  CurrentWorkspaceResponse,
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

import { createClientAction } from "../actions";
import {
  ClientForm,
  emptyClientFormValues,
} from "../ClientForm";

const getCreateClientContext = async () => {
  try {
    const [workspace, membership] = await Promise.all([
      requestApiJson<CurrentWorkspaceResponse>("/workspaces/current"),
      requestApiJson<CurrentMembershipResponse>("/memberships/current"),
    ]);

    return {
      membership,
      ownerOptions: workspace.memberships.map((workspaceMembership) => ({
        email: workspaceMembership.user.email,
        id: workspaceMembership.user.id,
        name: workspaceMembership.user.name,
      })),
    };
  } catch (error) {
    if (isApiRequestError(error) && error.status === 401) {
      redirect("/sign-in");
    }

    throw error;
  }
};

const NewClientPage = async () => {
  const { membership, ownerOptions } = await getCreateClientContext();

  return (
    <section className="space-y-6 px-0 py-1 lg:py-2">
      <WorkspacePageHeader
        kicker="New client"
        title="Create client"
        description="Add the paying company first, then jobs, contacts, and pipeline work can attach to a stable account record."
      />

      <Card className="max-w-4xl">
        <CardHeader>
          <CardTitle>Client baseline</CardTitle>
          <CardDescription>
            Capture the fields that make the account usable across recruiting
            operations without crossing into contacts or job intake yet.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ClientForm
            action={createClientAction}
            canManageClientControls={membership.role !== "coordinator"}
            initialValues={{
              ...emptyClientFormValues,
              ownerUserId: membership.userId,
            }}
            mode="create"
            ownerOptions={ownerOptions}
          />
        </CardContent>
      </Card>
    </section>
  );
};

export default NewClientPage;
