/** @format */

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export async function signOut(): Promise<void> {
  const supabase = await createClient();

  // scope "local": hanya mengakhiri sesi perangkat ini. Keluar dari seluruh
  // perangkat disediakan terpisah agar logout biasa tidak memutus sesi lain.
  await supabase.auth.signOut({ scope: "local" });

  revalidatePath("/", "layout");
  redirect("/login");
}
