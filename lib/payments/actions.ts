'use server';

import { redirect } from 'next/navigation';
import { createCustomerPortalSession } from './stripe';
import { withRole } from '@/lib/auth/middleware';

export const checkoutAction = withRole({ allowedRoles: ['owner'] }, async (formData) => {
  const priceId = formData.get('priceId') as string;

  if (!priceId) {
    redirect('/pricing');
  }

  redirect(`/api/billing/checkout?priceId=${encodeURIComponent(priceId)}`);
});

export const customerPortalAction = withRole({ allowedRoles: ['owner'] }, async (_, { workspace }) => {
  const portalSession = await createCustomerPortalSession(workspace);
  redirect(portalSession.url);
});
