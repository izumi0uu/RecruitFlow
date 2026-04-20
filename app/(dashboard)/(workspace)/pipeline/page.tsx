import {
  ModulePlaceholderPage,
  getPlaceholderViewState,
} from "@/components/workspace/ModulePlaceholderPage";

type PageProps = {
  searchParams?: Promise<{ state?: string }> | { state?: string };
};

const PipelinePage = async ({ searchParams }: PageProps) => {
  const params = await Promise.resolve(searchParams ?? {});

  return (
    <ModulePlaceholderPage
      kicker="Submission flow"
      title="Pipeline"
      description="The pipeline route is live in the global shell now, so later board and list views can attach to a fixed URL and shared loading treatment."
      emptyTitle="No submissions in flight yet"
      emptyDescription="Board and list switching, stage filters, risk flags, and submission ownership will arrive here once feature-submission-pipeline owns the real surface."
      ownerBranch="feature-submission-pipeline"
      plannedCapabilities={[
        "Board and list views controlled by URL state",
        "Shared filters for job, client, owner, stage, and risk",
        "A consistent route target from jobs, candidates, and dashboard",
      ]}
      state={getPlaceholderViewState(params.state)}
    />
  );
};

export default PipelinePage;
