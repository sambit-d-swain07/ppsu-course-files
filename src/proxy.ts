import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken } from './lib/jwt';

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const token = request.cookies.get('ppsu_auth_token')?.value;

  // Let NextJS internal, static, and public files pass through
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/auth') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  const payload = token ? await verifyToken(token) : null;

  // Root path routing
  if (pathname === '/') {
    if (payload) {
      const target = payload.role === 'FACULTY' ? '/faculty/dashboard' : '/coordinator/dashboard';
      return NextResponse.redirect(new URL(target, request.url));
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Role protections
  if (pathname.startsWith('/faculty')) {
    if (!payload) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    if (payload.role !== 'FACULTY' && payload.role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/coordinator/dashboard', request.url));
    }
  }

  if (pathname.startsWith('/coordinator')) {
    if (!payload) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    if (payload.role !== 'COORDINATOR' && payload.role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/faculty/dashboard', request.url));
    }
  }

  // Redirect from login if already authenticated
  if (pathname === '/login') {
    if (payload) {
      const target = payload.role === 'FACULTY' ? '/faculty/dashboard' : '/coordinator/dashboard';
      return NextResponse.redirect(new URL(target, request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api/auth|_next/static|_next/image|favicon.ico).*)'],
};
