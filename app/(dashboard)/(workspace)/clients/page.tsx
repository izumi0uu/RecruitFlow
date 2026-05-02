import { parseClientListFiltersFromRecord } from "@/lib/clients/filters";

import { ClientsListSurface } from "./components/ClientsListSurface";

type PageProps = {
  searchParams?:
    | Promise<Record<string, string | string[] | undefined>>
    | Record<string, string | string[] | undefined>;
};

const ClientsPage = async ({ searchParams }: PageProps) => {
  const params = await Promise.resolve(searchParams ?? {});
  const initialFilters = parseClientListFiltersFromRecord(params);

  return <ClientsListSurface initialFilters={initialFilters} />;
};

export default ClientsPage;
