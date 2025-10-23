import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(request: NextRequest) {
  // Debug NextAuth requests
  if (request.nextUrl.pathname.startsWith('/api/auth/')) {
    console.log("🔍 NextAuth request:", {
      method: request.method,
      url: request.nextUrl.pathname,
      hasBody: request.method !== 'GET',
      headers: {
        'content-type': request.headers.get('content-type'),
        'user-agent': request.headers.get('user-agent')?.substring(0, 50),
      }
    });
  }

  // ตรวจสอบ token เฉพาะ protected routes
  const protectedPaths = ["/dashboard", "/profile", "/booking"];
  const isProtectedPath = protectedPaths.some(path =>
    request.nextUrl.pathname.startsWith(path)
  );

  if (isProtectedPath) {
    try {
      const token = await getToken({
        req: request,
        secret: process.env.NEXTAUTH_SECRET
      });

      if (!token) {
        // ไม่มี token redirect ไป login
        return NextResponse.redirect(new URL("/login", request.url));
      }

      // Token ถูกต้อง ให้ผ่านไป
      return NextResponse.next();
    } catch (error) {
      // Token ไม่ถูกต้อง redirect ไป login
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};