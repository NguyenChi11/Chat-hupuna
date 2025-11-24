import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyJWT } from '@/lib/auth';

// Danh sách các trang cần bảo vệ
const protectedRoutes = ['/home'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Kiểm tra trang cần bảo vệ
  if (protectedRoutes.some((route) => pathname.startsWith(route))) {
    const token = request.cookies.get('session_token')?.value;

    // Nếu không có token hoặc token sai -> Đá về trang login (/)
    if (!token || !(await verifyJWT(token))) {
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  // 2. Nếu đã đăng nhập mà vào trang Login (/) -> Đá vào trang chủ
  if (pathname === '/') {
    const token = request.cookies.get('session_token')?.value;
    if (token && (await verifyJWT(token))) {
      return NextResponse.redirect(new URL('/home', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/', '/home/:path*', '/api/conversations/:path*', '/api/message/:path*'],
};
