'use server';

import { redirect } from 'next/navigation';
import { createCheckoutSession, createCustomerPortalSession } from './stripe';
import { withRole } from '@/lib/auth/middleware';

export const checkoutAction = withRole({ allowedRoles: ['owner'] }, async (formData, { workspace }) => {
  const priceId = formData.get('priceId') as string;
  await createCheckoutSession({ workspace, priceId });
});

export const customerPortalAction = withRole({ allowedRoles: ['owner'] }, async (_, { workspace }) => {
  const portalSession = await createCustomerPortalSession(workspace);
  redirect(portalSession.url);
});
