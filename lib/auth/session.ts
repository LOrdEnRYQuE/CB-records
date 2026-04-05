import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasRoleAccess } from "@/lib/auth/roles";
import type { UserRole } from "@/types/database";

export async function getSessionUser(): Promise<User | null> {
  try {
    const supabase = await createSupabaseServerClient();

    if (!supabase) {
      return null;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    return user;
  } catch {
    return null;
  }
}

export async function getSessionRole(userId: string): Promise<UserRole | null> {
  try {
    const supabase = await createSupabaseServerClient();

    if (!supabase) {
      return null;
    }

    const { data } = await supabase.from("users").select("role").eq("id", userId).maybeSingle();
    return data?.role ?? null;
  } catch {
    return null;
  }
}

export async function getSessionContext() {
  const user = await getSessionUser();

  if (!user) {
    return { user: null, role: null } as const;
  }

  const role = await getSessionRole(user.id);

  return {
    user,
    role,
  } as const;
}

export async function requireAdminAccess(pathname: string) {
  const { user, role } = await getSessionContext();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(pathname)}`);
  }

  if (!role) {
    redirect("/login?error=missing-role");
  }

  if (!hasRoleAccess(pathname, role)) {
    redirect("/admin/dashboard?error=insufficient-role");
  }

  return { user, role };
}
