import type { MemberRoleUpdateResponse } from "@recruitflow/contracts";

import { withBffApiErrorResponse } from "@/lib/api/bff";
import { requestApiJson } from "@/lib/api/client";

export const PATCH = (
  request: Request,
  { params }: { params: Promise<{ memberId: string }> },
) =>
  withBffApiErrorResponse(async () => {
    const [{ memberId }, payload] = await Promise.all([params, request.json()]);
    const member = await requestApiJson<MemberRoleUpdateResponse>(
      `/members/${memberId}/role`,
      {
        method: "PATCH",
        json: payload,
      },
    );

    return Response.json(member);
  });
