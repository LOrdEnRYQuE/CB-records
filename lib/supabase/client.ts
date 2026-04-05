"use client";

import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseConfig, hasSupabasePublicConfig } from "@/lib/supabase/config";

export function createSupabaseBrowserClient() {
  const { url, anonKey } = getSupabaseConfig();

  if (!hasSupabasePublicConfig() || !url || !anonKey) {
    throw new Error(
      "Missing Supabase public environment variables. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    );
  }

  return createBrowserClient(url, anonKey);
}
