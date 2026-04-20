import {
  ModulePlaceholderPage,
  getPlaceholderViewState,
} from "@/components/workspace/ModulePlaceholderPage";

type PageProps = {
  searchParams?: Promise<{ state?: string }> | { state?: string };
};

const DocumentsPage = async ({ searchParams }: PageProps) => {
  const params = await Promise.resolve(searchParams ?? {});

  return (
    <ModulePlaceholderPage
      kicker="Document operations"
      title="Documents"
      description="Documents are now part of the core navigation skeleton so later file management and AI search work can slot into the shared business shell."
      emptyTitle="No documents available yet"
      emptyDescription="Recent files, type filters, linked entities, and search tooling will show up here once feature-candidates-documents wires the real document workflows."
      ownerBranch="feature-candidates-documents"
      plannedCapabilities={[
        "Recent document views with type and entity filters",
        "A future AI-assisted search entry point anchored to one URL",
        "Shared navigation into candidate and job detail surfaces",
      ]}
      state={getPlaceholderViewState(params.state)}
    />
  );
};

export default DocumentsPage;
