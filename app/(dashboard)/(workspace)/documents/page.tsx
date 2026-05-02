import {
  parseDocumentListFiltersFromRecord,
} from "@/lib/documents/filters";

import { DocumentsListSurface } from "./components/DocumentsListSurface";

type PageProps = {
  searchParams?:
    | Promise<Record<string, string | string[] | undefined>>
    | Record<string, string | string[] | undefined>;
};

const DocumentsPage = async ({ searchParams }: PageProps) => {
  const params = await Promise.resolve(searchParams ?? {});
  const initialFilters = parseDocumentListFiltersFromRecord(params);

  return <DocumentsListSurface initialFilters={initialFilters} />;
};

export default DocumentsPage;
