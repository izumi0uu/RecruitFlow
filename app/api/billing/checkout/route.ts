import { getInternalApiOrigin, loadRootEnv } from "@recruitflow/config";
import type { BillingCheckoutResponse } from "@recruitflow/contracts";
import { NextRequest, NextResponse } from "next/server";

export const GET = async (request: NextRequest) => {
  const priceId = request.nextUrl.searchParams.get("priceId");

  if (!priceId) {
    return NextResponse.redirect(new URL("/pricing", request.url));
  }

  loadRootEnv();

  const response = await fetch(new URL("/billing/checkout", getInternalApiOrigin()), {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      cookie: request.headers.get("cookie") ?? "",
    },
    body: JSON.stringify({ priceId }),
    cache: "no-store",
  });

  if (response.status === 401) {
    const signInUrl = new URL("/sign-in", request.url);
    signInUrl.searchParams.set("redirect", "checkout");
    signInUrl.searchParams.set("priceId", priceId);

    return NextResponse.redirect(signInUrl);
  }

  if (!response.ok) {
    console.error("Billing checkout adapter failed", await response.text());
    return NextResponse.redirect(new URL("/pricing", request.url));
  }

  const payload = (await response.json()) as BillingCheckoutResponse;

  return NextResponse.redirect(payload.url);
};
