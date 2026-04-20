import { RouteLoadingFallback } from "@/components/navigation/RouteLoadingFallback";

const DashboardLoading = () => {
  return (
    <RouteLoadingFallback
      kicker="Dashboard"
      title="Loading the command center"
      description="Bringing the workspace dashboard shell into focus without dropping the shared navigation context."
      cardTitle="Preparing dashboard signals"
      cardDescription="Syncing the overview shell, route state, and placeholder content."
      rows={4}
    />
  );
};

export default DashboardLoading;
