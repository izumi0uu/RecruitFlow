import { notFound, redirect } from "next/navigation";

import type { ClientDetailResponse } from "@recruitflow/contracts";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { WorkspacePageHeader } from "@/components/workspace/WorkspacePageHeader";
import { isApiRequestError, requestApiJson } from "@/lib/api/client";

import { updateClientAction } from "../../actions";
import { ClientForm } from "../../ClientForm";

type PageProps = {
  params: Promise<{
    clientId: string;
  }>;
};

const getClientForEdit = async (clientId: string) => {
  try {
    return await requestApiJson<ClientDetailResponse>(`/clients/${clientId}`);
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

const EditClientPage = async ({ params }: PageProps) => {
  const { clientId } = await params;
  const { client, context, ownerOptions } = await getClientForEdit(clientId);

  if (client.status === "archived") {
    notFound();
  }

  return (
    <section className="space-y-6 px-0 py-1 lg:py-2">
      <WorkspacePageHeader
        kicker="Client maintenance"
        title={`Edit ${client.name}`}
        description="Update the baseline account record while keeping contacts, jobs, archive controls, and detail activity in their own downstream stories."
      />

      <Card className="max-w-4xl">
        <CardHeader>
          <CardTitle>Client baseline</CardTitle>
          <CardDescription>
            These fields feed the client list and later job intake entry
            points. The API still validates workspace scope and owner
            membership before saving.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ClientForm
            action={updateClientAction}
            canManageClientControls={context.role !== "coordinator"}
            clientId={client.id}
            initialValues={{
              hqLocation: client.hqLocation ?? "",
              industry: client.industry ?? "",
              name: client.name,
              notesPreview: client.notesPreview ?? "",
              ownerUserId: client.ownerUserId ?? ownerOptions[0]?.id ?? "",
              priority: client.priority,
              status: client.status,
              website: client.website ?? "",
            }}
            mode="edit"
            ownerOptions={ownerOptions}
          />
        </CardContent>
      </Card>
    </section>
  );
};

export default EditClientPage;
