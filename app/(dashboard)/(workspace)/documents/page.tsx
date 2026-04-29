import {
  ModulePlaceholderPage,
  getPlaceholderViewState,
} from "@/components/workspace/ModulePlaceholderPage";
import { getWorkspaceDemoOverview } from "@/lib/db/queries";

type PageProps = {
  searchParams?: Promise<{ state?: string }> | { state?: string };
};

const DocumentsPage = async ({ searchParams }: PageProps) => {
  const params = await Promise.resolve(searchParams ?? {});
  const overview = await getWorkspaceDemoOverview();

  return (
    <ModulePlaceholderPage
      demoState={
        overview?.documentCount
          ? {
              title: `${overview.documentCount} seeded documents attached`,
              description:
                "Resumes, job docs, and notes are now present in the shared workspace baseline so the documents route reads as a live module shell instead of a blank placeholder.",
            }
          : undefined
      }
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
