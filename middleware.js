import { NextResponse } from 'next/server';

export function middleware(request) {
  const url = request.nextUrl;
  
  if (url.pathname.startsWith('/admin')) {
    if (url.pathname === '/admin/login') return NextResponse.next();

    const token = request.cookies.get('admin_token')?.value;

    if (token !== process.env.ADMIN_PASSWORD) {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/admin/:path*',
};
