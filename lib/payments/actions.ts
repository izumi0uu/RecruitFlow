'use server';

import type { BillingPortalResponse } from "@recruitflow/contracts";
import { redirect } from 'next/navigation';

import { withRole } from '@/lib/auth/middleware';
import { isApiRequestError, requestApiJson } from "@/lib/api/client";

export const checkoutAction = withRole({ allowedRoles: ['owner'] }, async (formData) => {
  const priceId = formData.get('priceId') as string;

  if (!priceId) {
    redirect('/pricing');
  }

  redirect(`/api/billing/checkout?priceId=${encodeURIComponent(priceId)}`);
});

export const customerPortalAction = withRole({ allowedRoles: ['owner'] }, async () => {
  try {
    const portalSession = await requestApiJson<BillingPortalResponse>(
      "/billing/portal",
      {
        method: "POST",
      },
    );

    redirect(portalSession.url);
  } catch (error) {
    if (isApiRequestError(error)) {
      if (error.status === 401) {
        redirect("/sign-in");
      }

      if (error.status === 400 || error.status === 404) {
        redirect("/pricing");
      }
    }

    throw error;
  }
});
