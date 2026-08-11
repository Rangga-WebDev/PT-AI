/** @format */

import { createBrowserClient } from "@supabase/ssr";

import type { Database } from "@/lib/supabase/types";

// Hanya untuk Client Component yang benar-benar memerlukan Supabase browser API.
// Kunci yang dipakai adalah publishable key; seluruh akses data tetap dibatasi RLS.
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
