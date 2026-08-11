/** @format */

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import type { Database } from "@/lib/supabase/types";

// Klien untuk Server Component, Server Action, dan Route Handler.
// Penulisan cookie diabaikan saat dipanggil dari Server Component karena
// Next.js melarangnya; pembaruan sesi ditangani proxy.ts.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Dipanggil dari Server Component: aman diabaikan.
          }
        },
      },
    },
  );
}
