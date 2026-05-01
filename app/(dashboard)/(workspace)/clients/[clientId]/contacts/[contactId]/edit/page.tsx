import { ClientContactEditSurface } from "../../../../components/ClientContactEditSurface";

type PageProps = {
  params: Promise<{
    clientId: string;
    contactId: string;
  }>;
};

const EditClientContactPage = async ({ params }: PageProps) => {
  const { clientId, contactId } = await params;

  return (
    <ClientContactEditSurface clientId={clientId} contactId={contactId} />
  );
};

export default EditClientContactPage;
