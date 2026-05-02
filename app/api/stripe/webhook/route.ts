import { getInternalApiOrigin, loadRootEnv } from "@recruitflow/config";
import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

// TODO(api-boundary): This route is only a raw-payload proxy while local Stripe
// webhook tooling still targets Next. Keep all billing state changes in Nest.
export const POST = async (request: NextRequest) => {
  loadRootEnv();

  const requestId = request.headers.get("x-request-id") ?? randomUUID();
  const payload = await request.text();
  const response = await fetch(
    new URL("/billing/webhooks/stripe", getInternalApiOrigin()),
    {
      method: "POST",
      headers: {
        "content-type": request.headers.get("content-type") ?? "application/json",
        "stripe-signature": request.headers.get("stripe-signature") ?? "",
        "x-request-id": requestId,
      },
      body: payload,
      cache: "no-store",
    },
  );

  const responseHeaders = new Headers();
  responseHeaders.set("x-request-id", response.headers.get("x-request-id") ?? requestId);

  if (!response.ok) {
    const errorMessage = await response.text();
    return NextResponse.json(
      { error: errorMessage || "Stripe webhook proxy failed." },
      {
        headers: responseHeaders,
        status: response.status,
      },
    );
  }

  const body = await response.json();
  return NextResponse.json(body, {
    headers: responseHeaders,
    status: response.status,
  });
};
