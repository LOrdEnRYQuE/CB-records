"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/admin/dashboard", label: "Dashboard" },
  { href: "/admin/albums", label: "Albums" },
  { href: "/admin/tracks", label: "Tracks" },
  { href: "/admin/merch", label: "Merch" },
  { href: "/admin/media", label: "Media" },
  { href: "/admin/settings", label: "Settings" },
  { href: "/admin/audit", label: "Audit Logs" },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-full border-b border-white/10 bg-zinc-950/90 p-4 backdrop-blur md:sticky md:top-0 md:h-screen md:w-72 md:border-b-0 md:border-r md:p-5">
      <p className="eyebrow mb-4">Admin Panel</p>
      <nav className="flex flex-wrap gap-2 md:flex-col">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`rounded-lg border px-3 py-2 text-sm transition ${
              pathname === link.href
                ? "border-gold-500/70 bg-gold-500/15 text-gold-200 shadow-[inset_0_0_0_1px_rgba(212,175,55,0.12)]"
                : "border-white/10 bg-black/30 text-zinc-200 hover:border-gold-500 hover:text-white"
            }`}
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
