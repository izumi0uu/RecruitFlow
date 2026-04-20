import {
  ModulePlaceholderPage,
  getPlaceholderViewState,
} from "@/components/workspace/ModulePlaceholderPage";

type PageProps = {
  searchParams?: Promise<{ state?: string }> | { state?: string };
};

const ClientsPage = async ({ searchParams }: PageProps) => {
  const params = await Promise.resolve(searchParams ?? {});

  return (
    <ModulePlaceholderPage
      kicker="Client relationships"
      title="Clients"
      description="This shared placeholder protects the final `/clients` entry point while the CRM branch wires the real list view, filters, and creation flow."
      emptyTitle="No clients yet"
      emptyDescription="Client accounts, priority signals, and contact ownership will appear here once feature-clients-crm lands its list and detail experience."
      ownerBranch="feature-clients-crm"
      plannedCapabilities={[
        "Search, status, owner, and priority filters on the primary list view",
        "A Create Client entry point with predictable top-level navigation",
        "A stable handoff into future client detail pages and contacts",
      ]}
      state={getPlaceholderViewState(params.state)}
    />
  );
};

export default ClientsPage;
