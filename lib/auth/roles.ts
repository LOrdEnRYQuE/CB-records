import type { UserRole } from "@/types/database";

export const ADMIN_ROUTE_ROLES: Record<string, UserRole[]> = {
  "/admin/dashboard": ["admin", "editor", "media_manager"],
  "/admin/albums": ["admin", "editor"],
  "/admin/tracks": ["admin", "editor"],
  "/admin/media": ["admin", "media_manager", "editor"],
  "/admin/settings": ["admin"],
  "/admin/audit": ["admin", "editor"],
};

export function hasRoleAccess(pathname: string, role: UserRole) {
  const match = Object.entries(ADMIN_ROUTE_ROLES).find(([prefix]) =>
    pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  if (!match) {
    return true;
  }

  const [, allowedRoles] = match;
  return allowedRoles.includes(role);
}
