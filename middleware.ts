import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

// ─── Constants ────────────────────────────────────────────────────────────────

const PROTECTED_PATHS = ["/dashboard", "/profile", "/booking"];
const ADMIN_PATHS = ["/admin"];

// Maximum callback URL length to prevent DoS
const MAX_CALLBACK_URL_LENGTH = 2048;

// ─── Security Helpers ─────────────────────────────────────────────────────────

/**
 * Validate callback URL to prevent Open Redirect (OWASP A01)
 * Only allow relative URLs within the same origin
 */
function isValidCallbackUrl(url: string, origin: string): boolean {
  if (!url || url.length > MAX_CALLBACK_URL_LENGTH) {
    return false;
  }

  try {
    // If it's a relative URL, it's safe
    if (url.startsWith('/') && !url.startsWith('//')) {
      // Prevent path traversal
      const normalized = new URL(url, origin).pathname;
      return normalized === url || url.startsWith(normalized);
    }

    // If it's an absolute URL, check if it's same origin
    const callbackUrl = new URL(url);
    const requestOrigin = new URL(origin);
    
    return callbackUrl.origin === requestOrigin.origin;
  } catch {
    // Invalid URL format
    return false;
  }
}

/**
 * Sanitize pathname to prevent path traversal (OWASP A03)
 */
function sanitizePathname(pathname: string): string {
  // Remove any path traversal attempts
  return pathname.replaceAll('..', '').replaceAll('//', '/');
}

// ─── Redirect to login ───────────────────────────────────────────────────────

function redirectToLogin(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;
  const sanitizedPath = sanitizePathname(pathname);
  const loginUrl = new URL("/login", request.url);
  
  // A01: Validate callback URL to prevent Open Redirect
  if (isValidCallbackUrl(sanitizedPath, request.url)) {
    loginUrl.searchParams.set("callbackUrl", sanitizedPath);
  }
  
  return NextResponse.redirect(loginUrl);
}

// ─── Middleware ───────────────────────────────────────────────────────────────

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sanitizedPath = sanitizePathname(pathname);

  // ── Admin paths ───────────────────────────────────────────────────────────
  // A01: Protect admin routes - require authentication AND admin role
  const isAdminPath = ADMIN_PATHS.some((p) => sanitizedPath.startsWith(p));
  
  if (isAdminPath) {
    try {
      const token = await getToken({
        req:    request,
        secret: process.env.NEXTAUTH_SECRET,
      });

      if (!token) {
        return redirectToLogin(request);
      }

      // A01: Check token expiry
      if (token.exp && typeof token.exp === 'number' && Date.now() >= token.exp * 1000) {
        console.warn("[middleware] Token expired for admin path");
        return redirectToLogin(request);
      }

      // Note: Role validation done in page component due to encrypted role
      // Component will decode and verify admin role
      return NextResponse.next();
    } catch (error) {
      console.error("[middleware] Admin path validation error:", (error as Error).message);
      return redirectToLogin(request);
    }
  }

  // ── /badminton-court ─────────────────────────────────────────────────────
  // Note: Role checking moved to page component to avoid Edge Runtime limitations
  // Middleware only checks if user is authenticated
  if (sanitizedPath === "/badminton-court") {
    const token = await getToken({
      req:    request,
      secret: process.env.NEXTAUTH_SECRET,
    });

    //  ไม่มี token → redirect login
    if (!token) {
      return redirectToLogin(request);
    }

    // A01: Check token expiry
    if (token.exp && typeof token.exp === 'number' && Date.now() >= token.exp * 1000) {
      console.warn("[middleware] Token expired for badminton-court");
      return redirectToLogin(request);
    }

    // Let the page component handle role-based access and booking system status
    return NextResponse.next();
  }

  // ── Protected paths ───────────────────────────────────────────────────────
  // Note: Only check authentication here, role checking done in components
  const isProtectedPath = PROTECTED_PATHS.some((p) => sanitizedPath.startsWith(p));

  if (isProtectedPath) {
    try {
      const token = await getToken({
        req:    request,
        secret: process.env.NEXTAUTH_SECRET,
      });

      if (!token) {
        return redirectToLogin(request);
      }

      // A01: Check token expiry
      if (token.exp && typeof token.exp === 'number' && Date.now() >= token.exp * 1000) {
        console.warn("[middleware] Token expired for protected path");
        return redirectToLogin(request);
      }

      // Token exists and valid, let the page component handle role-based access
      return NextResponse.next();
    } catch (error) {
      console.error("[middleware] Token validation error:", (error as Error).message);
      return redirectToLogin(request);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    //  exclude static files, api routes, _next
    "/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|icons|images).*)",
  ],
};
