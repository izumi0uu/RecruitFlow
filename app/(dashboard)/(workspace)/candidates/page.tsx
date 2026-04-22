import {
  ModulePlaceholderPage,
  getPlaceholderViewState,
} from "@/components/workspace/ModulePlaceholderPage";
import { getWorkspaceDemoOverview } from "@/lib/db/queries";

type PageProps = {
  searchParams?: Promise<{ state?: string }> | { state?: string };
};

const CandidatesPage = async ({ searchParams }: PageProps) => {
  const params = await Promise.resolve(searchParams ?? {});
  const overview = await getWorkspaceDemoOverview();

  return (
    <ModulePlaceholderPage
      demoState={
        overview?.candidateCount
          ? {
              title: `${overview.candidateCount} seeded candidates in view`,
              description:
                "The shared demo baseline now includes recruiter-owned candidate profiles so later detail pages and document flows have realistic records to build on.",
            }
          : undefined
      }
      kicker="Talent pipeline"
      title="Candidates"
      description="The candidates route is pinned into the shared shell so the document-heavy profile workflow lands in the final IA from day one."
      emptyTitle="No candidates here yet"
      emptyDescription="Profiles, notes, linked documents, and submission history will appear here once feature-candidates-documents takes over this surface."
      ownerBranch="feature-candidates-documents"
      plannedCapabilities={[
        "List filters for skills, location, source, owner, and document readiness",
        "A stable handoff into candidate detail pages and linked documents",
        "Consistent navigation back to pipeline, jobs, and dashboard views",
      ]}
      state={getPlaceholderViewState(params.state)}
    />
  );
};

export default CandidatesPage;
