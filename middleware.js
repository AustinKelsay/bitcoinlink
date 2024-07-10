import { NextRequest, NextResponse } from 'next/server';
import { Ratelimit } from '@upstash/ratelimit';
import { kv } from '@vercel/kv';

const ratelimit = new Ratelimit({
  redis: kv,
  // 5 requests from the same IP in 10 seconds
  limiter: Ratelimit.slidingWindow(5, '10 s'),
});

export const config = {
  matcher: ['/api/:path*', '/((?!link).*)'],
};

export default async function combinedMiddleware(request) {
  const ip = request.ip ?? '127.0.0.1';
  const hostname = request.nextUrl.hostname;
  const referer = request.headers.get('referer') || '';

  // Base URL of your frontend
  const allowedBaseReferer = 'https://www.bitcoinlink.app';

  // Bypass rate limiting and referer check for the deployment IP
  if (hostname === 'www.bitcoinlink.app' || hostname === 'bitcoinlink.app') {
    return NextResponse.next();
  }

  // Bypass referer check for paths following /link
  if (request.nextUrl.pathname.startsWith('/link')) {
    const { success } = await ratelimit.limit(ip);
    return success
      ? NextResponse.next()
      : NextResponse.redirect(new URL('/blocked', request.url));
  }

  // Apply referer check for all other routes
  if (!referer.startsWith(allowedBaseReferer)) {
    return new NextResponse(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
  }

  // Apply rate limiting for all other routes
  const { success } = await ratelimit.limit(ip);
  return success
    ? NextResponse.next()
    : NextResponse.redirect(new URL('/blocked', request.url));
}
