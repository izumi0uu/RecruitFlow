import type { ReminderSuggestionMutationResponse } from "@recruitflow/contracts";
import type { NextRequest } from "next/server";

import { withBffApiErrorResponse } from "@/lib/api/bff";
import { requestApiJson } from "@/lib/api/client";

type RouteContext = {
  params:
    | Promise<{ reminderSuggestionId: string }>
    | { reminderSuggestionId: string };
};

export const POST = (request: NextRequest, context: RouteContext) =>
  withBffApiErrorResponse(async () => {
    const [{ reminderSuggestionId }, payload] = await Promise.all([
      Promise.resolve(context.params),
      request.json(),
    ]);
    const response = await requestApiJson<ReminderSuggestionMutationResponse>(
      `/tasks/reminder-suggestions/${reminderSuggestionId}/dismiss`,
      {
        json: payload,
        method: "POST",
      },
    );

    return Response.json(response);
  });
