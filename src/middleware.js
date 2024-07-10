import { NextRequest, NextResponse } from 'next/server';

export const config = {
  matcher: ['/api/:path*', '/((?!link).*)'],
};

export default async function minimalMiddleware(request) {
  return NextResponse.next();
}
