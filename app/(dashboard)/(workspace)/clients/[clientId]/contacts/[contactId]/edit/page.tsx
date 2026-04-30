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

import { updateContactAction } from "../../../../actions";
import { ContactForm } from "../../../../ContactForm";

type PageProps = {
  params: Promise<{
    clientId: string;
    contactId: string;
  }>;
};

const getClientDetail = async (clientId: string) => {
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

const EditClientContactPage = async ({ params }: PageProps) => {
  const { clientId, contactId } = await params;
  const { client, contacts } = await getClientDetail(clientId);
  const contact = contacts.find((candidate) => candidate.id === contactId);

  if (!contact) {
    notFound();
  }

  return (
    <section className="space-y-6 px-0 py-1 lg:py-2">
      <WorkspacePageHeader
        kicker="Contact maintenance"
        title={`Edit ${contact.fullName}`}
        description={`Keep ${client.name}'s relationship map current without leaving the client workspace boundary.`}
      />

      <Card className="max-w-4xl">
        <CardHeader>
          <CardTitle>Contact baseline</CardTitle>
          <CardDescription>
            Primary contact changes are normalized by the API so only one
            contact owns the handoff slot.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ContactForm
            action={updateContactAction}
            clientId={client.id}
            contactId={contact.id}
            initialValues={{
              email: contact.email ?? "",
              fullName: contact.fullName,
              isPrimary: contact.isPrimary,
              linkedinUrl: contact.linkedinUrl ?? "",
              phone: contact.phone ?? "",
              relationshipType: contact.relationshipType ?? "",
              title: contact.title ?? "",
            }}
            mode="edit"
          />
        </CardContent>
      </Card>
    </section>
  );
};

export default EditClientContactPage;
