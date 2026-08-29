/** @format */

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Proxy hanya melakukan dua hal (LOCK-TECH-009):
//   1. menyegarkan cookie sesi Supabase agar tidak kedaluwarsa saat menjelajah;
//   2. redirect optimistik untuk mengurangi render halaman yang pasti ditolak.
// Otorisasi sesungguhnya tetap dilakukan di Server Component, Server Action,
// Route Handler, dan RLS.

const PROTECTED_PREFIX = "/app";
const AUTH_ROUTES = ["/login", "/forgot-password"];

/**
 * Header keamanan disusun di sini, bukan di next.config.ts, karena CSP memakai
 * nonce yang harus baru pada setiap permintaan.
 *
 * `style-src-attr 'unsafe-inline'` sengaja diizinkan: bar progres dan diagram
 * memakai atribut `style` sebaris. Atribut style tidak dapat mengeksekusi
 * skrip, sehingga risikonya terbatas pada penyuntikan CSS — berbeda jauh dari
 * melonggarkan `script-src`, yang tetap ditutup rapat.
 */
function buildSecurityHeaders(nonce: string): Record<string, string> {
  const isDev = process.env.NODE_ENV === "development";
  const supabaseOrigin = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    `style-src 'self' 'nonce-${nonce}'`,
    "style-src-attr 'unsafe-inline'",
    "img-src 'self' blob: data:",
    "font-src 'self'",
    `connect-src 'self' ${supabaseOrigin}`.trim(),
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
  ].join("; ");

  return {
    "Content-Security-Policy": csp,
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "X-Frame-Options": "DENY",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
    "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
  };
}

export async function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const securityHeaders = buildSecurityHeaders(nonce);

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set(
    "Content-Security-Policy",
    securityHeaders["Content-Security-Policy"]!,
  );

  function withSecurityHeaders<T extends NextResponse>(response: T): T {
    for (const [key, value] of Object.entries(securityHeaders)) {
      response.headers.set(key, value);
    }
    return response;
  }

  let response = withSecurityHeaders(
    NextResponse.next({ request: { headers: requestHeaders } }),
  );

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = withSecurityHeaders(
            NextResponse.next({ request: { headers: requestHeaders } }),
          );
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  // Memanggil getUser() menyegarkan token yang hampir kedaluwarsa.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  if (!user && pathname.startsWith(PROTECTED_PREFIX)) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("redirectTo", pathname);
    return withSecurityHeaders(NextResponse.redirect(loginUrl));
  }

  if (user && AUTH_ROUTES.includes(pathname)) {
    const appUrl = request.nextUrl.clone();
    appUrl.pathname = "/app";
    appUrl.search = "";
    return withSecurityHeaders(NextResponse.redirect(appUrl));
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
