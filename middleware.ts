import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

// ─── Constants ────────────────────────────────────────────────────────────────

const PROTECTED_PATHS = ["/dashboard", "/profile", "/booking"];
const ADMIN_PATHS = ["/admin"];
const AUTH_ONLY_PATHS = ["/badminton-court"]; // authed แต่ role check ที่ component

const MAX_CALLBACK_URL_LENGTH = 2048;

// ─── Security Helpers ─────────────────────────────────────────────────────────

function isValidCallbackUrl(url: string, origin: string): boolean {
  if (!url || url.length > MAX_CALLBACK_URL_LENGTH) return false;

  try {
    if (url.startsWith('/') && !url.startsWith('//')) {
      const normalized = new URL(url, origin).pathname;
      return normalized === url || url.startsWith(normalized);
    }
    const callbackUrl = new URL(url);
    const requestOrigin = new URL(origin);
    return callbackUrl.origin === requestOrigin.origin;
  } catch {
    return false;
  }
}

function sanitizePathname(pathname: string): string {
  return decodeURIComponent(pathname)   // decode %2F ก่อน
    .replaceAll('\\', '/')            // backslash → slash
    .replace(/\/\.\.?\//g, '/')       // /../ หรือ /./ 
    .replace(/\/\/+/g, '/')           // // → /
    .replace(/\.\.$/, '')             // trailing ..
    .trim();
}

// ─── Security Headers ─────────────────────────────────────────────────────────

function applySecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  return response;
}

// ─── Redirect to login ────────────────────────────────────────────────────────

function redirectToLogin(request: NextRequest, sanitizedPath: string): NextResponse {
  const loginUrl = new URL("/login", request.url);

  if (isValidCallbackUrl(sanitizedPath, request.url)) {
    loginUrl.searchParams.set("callbackUrl", sanitizedPath);
  }

  return applySecurityHeaders(NextResponse.redirect(loginUrl));
}

// ─── Middleware ───────────────────────────────────────────────────────────────

export async function middleware(request: NextRequest) {
  const sanitizedPath = sanitizePathname(request.nextUrl.pathname);

  const isAdminPath = ADMIN_PATHS.some((p) => sanitizedPath.startsWith(p));
  const isProtectedPath = PROTECTED_PATHS.some((p) => sanitizedPath.startsWith(p));
  const isAuthOnlyPath = AUTH_ONLY_PATHS.some((p) => sanitizedPath.startsWith(p));

  // ── Public path — แค่ใส่ security headers แล้วผ่านเลย ──────────────────
  if (!isAdminPath && !isProtectedPath && !isAuthOnlyPath) {
    return applySecurityHeaders(NextResponse.next());
  }

  // ── ดึง token ครั้งเดียวสำหรับทุก protected path ───────────────────────
  let token: Awaited<ReturnType<typeof getToken>>;
  try {
    token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });
  } catch (error) {
    console.error("[middleware] getToken error:", (error as Error).message);
    return redirectToLogin(request, sanitizedPath);
  }

  // ── ไม่มี token → redirect login ───────────────────────────────────────
  if (!token) {
    return redirectToLogin(request, sanitizedPath);
  }

  // ── Token หมดอายุ → redirect login ─────────────────────────────────────
  if (token.exp && typeof token.exp === 'number' && Date.now() >= token.exp * 1000) {
    console.warn(`[middleware] Token expired — path: ${sanitizedPath}`);
    return redirectToLogin(request, sanitizedPath);
  }

  // ── ผ่านทุก check → ส่ง request ต่อพร้อม security headers ────────────
  // Role-based access ทำที่ page component เพราะ role ถูก encrypt ไว้
  return applySecurityHeaders(NextResponse.next());
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|icons|images).*)",
  ],
};