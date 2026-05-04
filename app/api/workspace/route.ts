import { getCurrentWorkspace } from "@/lib/db/queries";
import { toQueryDto } from "@/lib/query/types";

export const GET = async () => {
  const workspace = await getCurrentWorkspace();

  return Response.json(toQueryDto(workspace));
};
