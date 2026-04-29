import {
  ModulePlaceholderPage,
  getPlaceholderViewState,
} from "@/components/workspace/ModulePlaceholderPage";
import { getWorkspaceDemoOverview } from "@/lib/db/queries";

type PageProps = {
  searchParams?: Promise<{ state?: string }> | { state?: string };
};

const JobsPage = async ({ searchParams }: PageProps) => {
  const params = await Promise.resolve(searchParams ?? {});
  const overview = await getWorkspaceDemoOverview();

  return (
    <ModulePlaceholderPage
      demoState={
        overview?.jobCount
          ? {
              title: `${overview.jobCount} seeded jobs already mapped`,
              description: `${overview.openJobCount} active role${overview.openJobCount === 1 ? "" : "s"} are available for intake and list-shell QA before the jobs branch takes over.`,
            }
          : undefined
      }
      kicker="Role intake"
      title="Jobs"
      description="The top-level jobs route is now reserved in the shared shell so intake and role management can land without inventing another navigation path."
      emptyTitle="No jobs in view yet"
      emptyDescription="Open roles, owners, status filters, and job detail handoffs will appear here once feature-jobs-intake ships the first operational slice."
      ownerBranch="feature-jobs-intake"
      plannedCapabilities={[
        "Status, client, owner, and priority filters on the jobs list",
        "An eventual path into `/jobs/[jobId]` for intake and submission context",
        "A stable jump point from dashboard and client detail surfaces",
      ]}
      state={getPlaceholderViewState(params.state)}
    />
  );
};

export default JobsPage;
