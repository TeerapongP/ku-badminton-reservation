import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import jwt from "jsonwebtoken";

export function middleware(request: NextRequest) {
  // ตรวจสอบ token เฉพาะ protected routes
  const protectedPaths = ["/dashboard", "/profile", "/booking"];
  const isProtectedPath = protectedPaths.some(path => 
    request.nextUrl.pathname.startsWith(path)
  );

  if (isProtectedPath) {
    const token = request.cookies.get("auth-token")?.value;

    if (!token) {
      // ไม่มี token redirect ไป login
      return NextResponse.redirect(new URL("/login", request.url));
    }

    try {
      const secret = process.env.JWT_SECRET || "your-secret-key";
      jwt.verify(token, secret);
      // Token ถูกต้อง ให้ผ่านไป
      return NextResponse.next();
    } catch (error) {
      // Token ไม่ถูกต้อง redirect ไป login
      const response = NextResponse.redirect(new URL("/login", request.url));
      response.cookies.delete("auth-token"); // ลบ token ที่เสีย
      return response;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};