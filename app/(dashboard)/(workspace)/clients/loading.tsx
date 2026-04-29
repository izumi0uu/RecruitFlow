import { RouteLoadingFallback } from "@/components/navigation/RouteLoadingFallback";

const ClientsLoading = () => {
  return (
    <RouteLoadingFallback
      kicker="Client relationships"
      title="Loading clients"
      description="Resolving the current workspace and preparing the client account list."
      cardTitle="Preparing client CRM"
      cardDescription="Syncing filters, owners, and workspace-scoped account records."
      rows={5}
    />
  );
};

export default ClientsLoading;
