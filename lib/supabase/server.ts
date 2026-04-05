import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseConfig, hasSupabasePublicConfig } from "@/lib/supabase/config";

export async function createSupabaseServerClient() {
  const { url, anonKey } = getSupabaseConfig();

  if (!hasSupabasePublicConfig() || !url || !anonKey) {
    return null;
  }

  const cookieStore = await cookies();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const cookie of cookiesToSet) {
            cookieStore.set(cookie.name, cookie.value, cookie.options);
          }
        } catch {
          // In some server-render contexts (including Edge/OpenNext), cookies
          // may be read-only. Ignore writes here and rely on middleware/actions
          // for cookie persistence.
        }
      },
    },
  });
}

export function createSupabaseAdminClient() {
  const { url, serviceRoleKey } = getSupabaseConfig();

  if (!url || !serviceRoleKey) {
    return null;
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
