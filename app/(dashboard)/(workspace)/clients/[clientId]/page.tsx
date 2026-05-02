import { ClientDetailSurface } from "../components/ClientDetailSurface";

type PageProps = {
  params: Promise<{
    clientId: string;
  }>;
};

const ClientDetailPage = async ({ params }: PageProps) => {
  const { clientId } = await params;

  return <ClientDetailSurface clientId={clientId} />;
};

export default ClientDetailPage;
