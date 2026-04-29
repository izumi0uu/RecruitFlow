import { getInternalApiOrigin, loadRootEnv } from "@recruitflow/config";
import { NextRequest, NextResponse } from 'next/server';

export const POST = async (request: NextRequest) => {
    loadRootEnv();

    const payload = await request.text();
    const response = await fetch(new URL('/billing/webhooks/stripe', getInternalApiOrigin()), {
        method: 'POST',
        headers: {
            'content-type': request.headers.get('content-type') ?? 'application/json',
            'stripe-signature': request.headers.get('stripe-signature') ?? '',
        },
        body: payload,
        cache: 'no-store',
    });

    if (!response.ok) {
        const errorMessage = await response.text();
        return NextResponse.json({ error: errorMessage || 'Stripe webhook proxy failed.' }, { status: response.status });
    }

    const body = await response.json();
    return NextResponse.json(body, { status: response.status });
};
