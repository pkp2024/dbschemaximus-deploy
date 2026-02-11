import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

function isEnabled(value: string | undefined): boolean {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  return normalized === 'true' || normalized === '1' || normalized === 'yes' || normalized === 'on';
}

function unauthorizedResponse() {
  return new NextResponse('Authentication required', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Secure Area", charset="UTF-8"',
    },
  });
}

export function middleware(request: NextRequest) {
  if (!isEnabled(process.env.BASIC_AUTH_ENABLED)) {
    return NextResponse.next();
  }

  const expectedUsername = process.env.BASIC_AUTH_USER?.trim();
  const expectedPassword = process.env.BASIC_AUTH_PASSWORD?.trim();

  if (!expectedUsername || !expectedPassword) {
    return new NextResponse('Basic auth enabled but credentials are not configured.', {
      status: 500,
    });
  }

  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Basic ')) {
    return unauthorizedResponse();
  }

  const encodedCredentials = authHeader.slice(6).trim();
  let decodedCredentials = '';

  try {
    decodedCredentials = atob(encodedCredentials);
  } catch {
    return unauthorizedResponse();
  }

  const separatorIndex = decodedCredentials.indexOf(':');
  if (separatorIndex === -1) {
    return unauthorizedResponse();
  }

  const username = decodedCredentials.slice(0, separatorIndex);
  const password = decodedCredentials.slice(separatorIndex + 1);

  if (username !== expectedUsername || password !== expectedPassword) {
    return unauthorizedResponse();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)',
  ],
};
