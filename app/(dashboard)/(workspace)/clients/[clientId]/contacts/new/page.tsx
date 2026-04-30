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

import { createContactAction } from "../../../actions";
import {
  ContactForm,
  emptyContactFormValues,
} from "../../../ContactForm";

type PageProps = {
  params: Promise<{
    clientId: string;
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

const NewClientContactPage = async ({ params }: PageProps) => {
  const { clientId } = await params;
  const { client, contacts } = await getClientDetail(clientId);

  return (
    <section className="space-y-6 px-0 py-1 lg:py-2">
      <WorkspacePageHeader
        kicker="New contact"
        title={`Add contact for ${client.name}`}
        description="Capture the relationship entry point without turning this story into notes, tasks, or job intake."
      />

      <Card className="max-w-4xl">
        <CardHeader>
          <CardTitle>Contact baseline</CardTitle>
          <CardDescription>
            The first contact is marked primary by default so the client detail
            page always has a useful handoff person.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ContactForm
            action={createContactAction}
            clientId={client.id}
            initialValues={{
              ...emptyContactFormValues,
              isPrimary: contacts.length === 0,
            }}
            mode="create"
          />
        </CardContent>
      </Card>
    </section>
  );
};

export default NewClientContactPage;
