import { NextRequest, NextResponse } from 'next/server';

export const GET = async (request: NextRequest) => {
    const searchParams = request.nextUrl.searchParams;
    const sessionId = searchParams.get('session_id');
    if (!sessionId) {
        return NextResponse.redirect(new URL('/pricing', request.url));
    }
    return NextResponse.redirect(new URL('/dashboard', request.url));
};
