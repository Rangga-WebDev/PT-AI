/** @format */

import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";

// Menukar kode dari tautan surel menjadi sesi, lalu mengarahkan ke halaman tujuan.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const nextParam = searchParams.get("next");
  const next =
    nextParam && nextParam.startsWith("/") && !nextParam.startsWith("//")
      ? nextParam
      : "/app";

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=tautan-tidak-valid`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(`${origin}/login?error=tautan-kedaluwarsa`);
  }

  return NextResponse.redirect(`${origin}${next}`);
}
