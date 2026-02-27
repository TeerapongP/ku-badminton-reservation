import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { decode } from './lib/Cryto';

// ─── Constants ────────────────────────────────────────────────────────────────

const PROTECTED_PATHS = ["/dashboard", "/profile", "/booking"];
const ADMIN_ROLES     = new Set(["admin", "super_admin"]);

// ─── Decode role จาก encrypted token ─────────────────────────────────────────

async function decodeRole(encryptedRole: unknown): Promise<string | null> {
  if (typeof encryptedRole !== "string" || !encryptedRole) return null;

  try {
    return await decode(encryptedRole);
  } catch {
    // A09: ไม่ log ค่า role เพราะเป็น sensitive data
    console.error("[proxy] Failed to decode role");
    return null;
  }
}

// ─── Check booking system status ─────────────────────────────────────────────

async function checkBookingSystemStatus(request: NextRequest): Promise<boolean> {
  try {
    //  ใช้ origin จาก request แทน request.url เต็ม เพื่อกัน open redirect
    const origin = request.nextUrl.origin;
    const apiUrl = new URL("/api/admin/booking-system", origin);

    const response = await fetch(apiUrl.toString(), {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        //  ส่ง internal header เพื่อให้ API route รู้ว่ามาจาก middleware
        "x-internal-request": process.env.INTERNAL_API_SECRET ?? "",
      },
      //  กัน middleware วน fetch ตัวเอง
      cache: "no-store",
    });

    if (!response.ok) {
      console.error("[middleware] Booking system status fetch failed:", response.status);
      return false;
    }

    const data = await response.json();
    return data.effectiveStatus === true;
  } catch (error) {
    console.error("[middleware] checkBookingSystemStatus error:", (error as Error).message);
    return false;
  }
}

// ─── Redirect to login ───────────────────────────────────────────────────────

function redirectToLogin(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;
  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("callbackUrl", pathname);
  return NextResponse.redirect(loginUrl);
}

// ─── Proxy ────────────────────────────────────────────────────────────────────

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── /badminton-court ─────────────────────────────────────────────────────
  if (pathname === "/badminton-court") {
    const token = await getToken({
      req:    request,
      secret: process.env.NEXTAUTH_SECRET,
    });

    //  ไม่มี token → redirect login
    if (!token) {
      return redirectToLogin(request);
    }

    //  decode role ก่อน compare (เพราะ encode ไว้ใน session callback)
    const role    = await decodeRole(token.role);
    const isAdmin = ADMIN_ROLES.has(role ?? "");

    if (process.env.NODE_ENV === "development") {
      console.log("[middleware] badminton-court:", { role, isAdmin });
    }

    //  admin ผ่านได้เสมอ
    if (isAdmin) {
      return NextResponse.next();
    }

    //  ไม่ใช่ admin → เช็คสถานะระบบ
    const isSystemOpen = await checkBookingSystemStatus(request);

    if (!isSystemOpen) {
      //  มี explicit return เมื่อระบบปิด
      return NextResponse.redirect(new URL("/booking-closed", request.url));
    }

    return NextResponse.next();
  }

  // ── Protected paths ───────────────────────────────────────────────────────
  const isProtectedPath = PROTECTED_PATHS.some((p) => pathname.startsWith(p));

  if (isProtectedPath) {
    try {
      const token = await getToken({
        req:    request,
        secret: process.env.NEXTAUTH_SECRET,
      });

      if (!token) {
        return redirectToLogin(request);
      }

      //  decode role เผื่อต้องการ role-based access ในอนาคต
      const role = await decodeRole(token.role);

      if (!role) {
        // token มี role แต่ decode ไม่ได้ → session ถูก tamper
        return redirectToLogin(request);
      }

      return NextResponse.next();
    } catch (error) {
      console.error("[middleware] Token validation error:", (error as Error).message);
      return redirectToLogin(request);
    }
  }

  return NextResponse.next();
}

// ─── Matcher ──────────────────────────────────────────────────────────────────

export const config = {
  matcher: [
    //  exclude static files, api routes, _next
    "/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|icons|images).*)",
  ],
};
