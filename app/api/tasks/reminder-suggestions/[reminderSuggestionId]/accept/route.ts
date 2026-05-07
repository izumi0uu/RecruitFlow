import type { ReminderSuggestionMutationResponse } from "@recruitflow/contracts";

import { withBffApiErrorResponse } from "@/lib/api/bff";
import { requestApiJson } from "@/lib/api/client";

type RouteContext = {
  params:
    | Promise<{ reminderSuggestionId: string }>
    | { reminderSuggestionId: string };
};

export const POST = (_request: Request, context: RouteContext) =>
  withBffApiErrorResponse(async () => {
    const { reminderSuggestionId } = await Promise.resolve(context.params);
    const response = await requestApiJson<ReminderSuggestionMutationResponse>(
      `/tasks/reminder-suggestions/${reminderSuggestionId}/accept`,
      { method: "POST" },
    );

    return Response.json(response);
  });
