import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // For now, just allow all requests since we're using client-side auth
  // In a production app, you'd validate a session/token here
  return NextResponse.next();
}

export const config = {
  matcher: ['/employee/:path*', '/finance/:path*'],
};
