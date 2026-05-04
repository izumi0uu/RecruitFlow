"use client";

import { clientContactMutationRequestSchema } from "@recruitflow/contracts";
import { useQuery } from "@tanstack/react-query";
import { Loader2, RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
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
import { isApiRequestError } from "@/lib/api/errors";
import { clientDetailQueryOptions } from "@/lib/query/options";

import { ContactForm, type ContactFormValues } from "./ContactForm";
import { useClientContactUpdateMutation } from "./hooks/useClientMutations";

type ClientContactEditSurfaceProps = {
  clientId: string;
  contactId: string;
};

const ClientContactEditLoadingState = ({ clientId }: { clientId: string }) => (
  <section className="space-y-6 px-0 py-1 lg:py-2">
    <WorkspacePageHeader
      backHref={`/clients/${clientId}`}
      breadcrumbItems={[
        { label: "Clients", href: "/clients" },
        { label: "Client", href: `/clients/${clientId}` },
        { label: "Loading contact" },
      ]}
      kicker="Contact maintenance"
      title="Loading contact"
      description="The contact baseline is loading through the client query cache."
    />
    <Card className="w-full">
      <CardContent className="flex min-h-64 flex-col items-center justify-center gap-3 py-14 text-center">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
        <p className="text-sm font-medium text-foreground">Loading contact</p>
      </CardContent>
    </Card>
  </section>
);

const ClientContactEditErrorState = ({
  clientId,
  clientName,
  error,
  isNotFound: isLocalNotFound,
  onRetry,
}: {
  clientId: string;
  clientName?: string;
  error: unknown;
  isNotFound?: boolean;
  onRetry: () => void;
}) => {
  const isNotFound =
    isLocalNotFound || (isApiRequestError(error) && error.status === 404);
  const clientLabel = clientName ?? "Client";

  return (
    <section className="space-y-6 px-0 py-1 lg:py-2">
      <WorkspacePageHeader
        backHref={`/clients/${clientId}`}
        breadcrumbItems={[
          { label: "Clients", href: "/clients" },
          { label: clientLabel, href: `/clients/${clientId}` },
          {
            label: isNotFound ? "Contact not found" : "Unable to load contact",
          },
        ]}
        kicker="Contact maintenance"
        title={isNotFound ? "Contact not found" : "Unable to load contact"}
        description={
          isNotFound
            ? "This contact may have been removed or may not belong to the current workspace."
            : "The contact detail request returned an error."
        }
      />
      <Card className="w-full">
        <CardContent className="space-y-4 pt-6">
          {!isNotFound ? (
            <p className="status-message status-error">
              {error instanceof Error
                ? error.message
                : "The contact request failed."}
            </p>
          ) : null}
          <div className="flex flex-wrap items-center gap-3">
            {!isNotFound ? (
              <Button
                className="rounded-full"
                type="button"
                variant="outline"
                onClick={onRetry}
              >
                <RotateCcw className="size-4" />
                Retry
              </Button>
            ) : null}
            <Button asChild className="rounded-full" variant="outline">
              <TrackedLink href={`/clients/${clientId}`}>
                Open client
              </TrackedLink>
            </Button>
          </div>
        </CardContent>
      </Card>
    </section>
  );
};

const ClientContactEditSurface = ({
  clientId,
  contactId,
}: ClientContactEditSurfaceProps) => {
  const router = useRouter();
  const [validationError, setValidationError] = React.useState<string | null>(
    null,
  );
  const {
    data: clientDetail,
    error: detailError,
    isError,
    isLoading,
    refetch,
  } = useQuery(clientDetailQueryOptions(clientId));
  const contact = clientDetail?.contacts.find(
    (candidate) => candidate.id === contactId,
  );
  const {
    error: mutationError,
    isPending,
    resetError: resetMutationError,
    updateContact,
  } = useClientContactUpdateMutation({
    clientId,
    contactId,
    onSuccess: () => {
      router.push(`/clients/${clientId}`);
    },
  });
  const initialValues = React.useMemo<ContactFormValues | null>(
    () =>
      contact
        ? {
            email: contact.email ?? "",
            fullName: contact.fullName,
            isPrimary: contact.isPrimary,
            linkedinUrl: contact.linkedinUrl ?? "",
            phone: contact.phone ?? "",
            relationshipType: contact.relationshipType ?? "",
            title: contact.title ?? "",
          }
        : null,
    [contact],
  );

  if (isLoading) {
    return <ClientContactEditLoadingState clientId={clientId} />;
  }

  if (isError || !clientDetail) {
    return (
      <ClientContactEditErrorState
        clientId={clientId}
        error={detailError}
        onRetry={() => {
          void refetch();
        }}
      />
    );
  }

  if (!contact || !initialValues) {
    return (
      <ClientContactEditErrorState
        clientId={clientId}
        error={new Error("Client contact not found.")}
        clientName={clientDetail.client.name}
        isNotFound
        onRetry={() => {
          void refetch();
        }}
      />
    );
  }

  return (
    <section className="space-y-6 px-0 py-1 lg:py-2">
      <WorkspacePageHeader
        backHref={`/clients/${clientId}`}
        breadcrumbItems={[
          { label: "Clients", href: "/clients" },
          { label: clientDetail.client.name, href: `/clients/${clientId}` },
          { label: "Edit contact" },
        ]}
        kicker="Contact maintenance"
        title={`Edit ${contact.fullName}`}
        description={`Keep ${clientDetail.client.name}'s relationship map current without leaving the client workspace boundary.`}
      />

      <Card className="w-full">
        <CardHeader>
          <CardTitle>Contact baseline</CardTitle>
          <CardDescription>
            Primary contact changes are normalized by the API so only one
            contact owns the handoff slot.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ContactForm
            clientId={clientDetail.client.id}
            error={validationError ?? mutationError}
            initialValues={initialValues}
            isPending={isPending}
            mode="edit"
            onSubmit={(values) => {
              setValidationError(null);
              resetMutationError();
              const parsedPayload =
                clientContactMutationRequestSchema.safeParse(values);

              if (!parsedPayload.success) {
                setValidationError(
                  parsedPayload.error.issues[0]?.message ??
                    "Invalid client contact payload.",
                );
                return;
              }

              updateContact(parsedPayload.data);
            }}
            onValuesChange={() => {
              setValidationError(null);
              resetMutationError();
            }}
          />
        </CardContent>
      </Card>
    </section>
  );
};

export { ClientContactEditSurface };
