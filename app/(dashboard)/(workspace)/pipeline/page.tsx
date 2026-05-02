import {
  ModulePlaceholderPage,
  getPlaceholderViewState,
} from "@/components/workspace/ModulePlaceholderPage";
import { getWorkspaceDemoOverview } from "@/lib/db/queries";

type PageProps = {
  searchParams?:
    | Promise<{ state?: string; submissionCreated?: string }>
    | { state?: string; submissionCreated?: string };
};

const PipelinePage = async ({ searchParams }: PageProps) => {
  const params = await Promise.resolve(searchParams ?? {});
  const overview = await getWorkspaceDemoOverview();
  const submissionCreated = params.submissionCreated === "1";

  return (
    <ModulePlaceholderPage
      demoState={
        submissionCreated
          ? {
              title: "Opportunity launched",
              description:
                "The candidate is now active for this role through the API-owned create flow. Board and list views will take over this route in the next pipeline story.",
            }
          : overview?.submissionCount
          ? {
              title: `${overview.submissionCount} seeded submissions in motion`,
              description:
                "The foundation seed now gives pipeline QA real records across sourced, submitted, and interview stages, so the route no longer opens as a blank shell.",
            }
          : undefined
      }
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
