import type {
  NoteMutationResponse,
  NotesListResponse,
} from "@recruitflow/contracts";
import type { NextRequest } from "next/server";

import { withBffApiErrorResponse } from "@/lib/api/bff";
import { requestApiJson } from "@/lib/api/client";

export const GET = (request: NextRequest) =>
  withBffApiErrorResponse(async () => {
    const queryString = request.nextUrl.searchParams.toString();
    const notes = await requestApiJson<NotesListResponse>(
      `/notes${queryString ? `?${queryString}` : ""}`,
    );

    return Response.json(notes);
  });

export const POST = (request: NextRequest) =>
  withBffApiErrorResponse(async () => {
    const payload = await request.json();
    const note = await requestApiJson<NoteMutationResponse>("/notes", {
      method: "POST",
      json: payload,
    });

    return Response.json(note, { status: 201 });
  });
