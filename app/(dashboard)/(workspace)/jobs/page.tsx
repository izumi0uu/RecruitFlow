import {
  ModulePlaceholderPage,
  getPlaceholderViewState,
} from "@/components/workspace/ModulePlaceholderPage";

type PageProps = {
  searchParams?: Promise<{ state?: string }> | { state?: string };
};

const JobsPage = async ({ searchParams }: PageProps) => {
  const params = await Promise.resolve(searchParams ?? {});

  return (
    <ModulePlaceholderPage
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
