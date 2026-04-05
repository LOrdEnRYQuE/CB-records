import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getSupabaseConfig, hasSupabasePublicConfig } from "@/lib/supabase/config";

export async function updateSession(request: NextRequest) {
  const nextResponse = NextResponse.next({ request });

  const { url, anonKey } = getSupabaseConfig();

  if (!hasSupabasePublicConfig() || !url || !anonKey) {
    return { response: nextResponse, user: null };
  }

  let response = nextResponse;

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const cookie of cookiesToSet) {
          request.cookies.set(cookie.name, cookie.value);
        }

        response = NextResponse.next({ request });

        for (const cookie of cookiesToSet) {
          response.cookies.set(cookie.name, cookie.value, cookie.options);
        }
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { response, user };
}
