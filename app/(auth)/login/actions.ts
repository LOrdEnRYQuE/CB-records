"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function signInAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "").trim();
  const next = String(formData.get("next") ?? "/admin/dashboard");

  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    redirect("/login?error=missing-supabase-config");
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect("/login?error=invalid-credentials");
  }

  redirect(next.startsWith("/") ? next : "/admin/dashboard");
}
