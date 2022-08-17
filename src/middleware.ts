import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const url = request.nextUrl.clone();

  if (
    request.nextUrl.pathname.startsWith('/channel') ||
    request.nextUrl.pathname.startsWith('/c') ||
    request.nextUrl.pathname.startsWith('/user')
  ) {
    url.pathname = `/${encodeURIComponent(`youtube.com${request.nextUrl.pathname}`)}`;
    return NextResponse.redirect(url);
  }

  if (request.nextUrl.pathname.startsWith('/playlist')) {
    url.pathname = `/${encodeURIComponent(
      `youtube.com/playlist?list=${request.nextUrl.searchParams.get('list')}`
    )}`;
    return NextResponse.redirect(url);
  }
}

export const config = {
  matcher: ['/channel/:channelId*', '/c/:channelName*', '/user/:channelName*', '/playlist'],
};
