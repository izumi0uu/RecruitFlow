import { RouteLoadingFallback } from "@/components/navigation/RouteLoadingFallback";

const DashboardLoading = () => {
  return (
    <RouteLoadingFallback
      kicker="Workspace settings"
      title="Loading the next settings view"
      description="Bringing the next dashboard surface into focus without dropping your current context."
      cardTitle="Preparing your workspace"
      cardDescription="Syncing the next route's account, billing, and team state."
    />
  );
};

export default DashboardLoading;
