import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

// ฟังก์ชันตรวจสอบสถานะระบบการจอง
async function checkBookingSystemStatus(request: NextRequest) {
  try {
    // สร้าง URL สำหรับเรียก internal API
    const apiUrl = new URL('/api/admin/booking-system', request.url);

    // เรียก API เพื่อเช็คสถานะ
    const response = await fetch(apiUrl.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error('Failed to fetch booking system status:', response.status);
      return false;
    }

    const data = await response.json();

    // ใช้ effectiveStatus จาก API
    return data.effectiveStatus || false;
  } catch (error) {
    console.error('Error checking booking system status:', error);
    return false;
  }
}

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

  // ตรวจสอบสถานะระบบการจองสำหรับหน้า badminton-court
  if (request.nextUrl.pathname === '/badminton-court') {
    // เช็ค authentication ก่อน
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET
    });

    // ถ้ายังไม่ login ให้เด้งไป login
    if (!token) {
      console.log("🚫 Not authenticated - redirecting to login");
      return NextResponse.redirect(new URL("/login", request.url));
    }

    const userRole = (token as any)?.role;
    const isAdmin = userRole === 'admin' || userRole === 'super_admin';

    console.log("🏸 Badminton court access check:", {
      pathname: request.nextUrl.pathname,
      userRole,
      isAdmin,
      isAuthenticated: !!token,
    });

    // ถ้าเป็น admin หรือ super_admin ให้ผ่านได้เสมอ
    if (isAdmin) {
      console.log("✅ Admin access granted");
      return NextResponse.next();
    }

    // ถ้าไม่ใช่ admin ให้เช็คสถานะระบบ
    const isSystemOpen = await checkBookingSystemStatus(request);

    console.log("🏸 System status check:", {
      isSystemOpen,
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