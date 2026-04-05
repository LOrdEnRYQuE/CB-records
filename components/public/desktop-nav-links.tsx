"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Props = {
  isAuthenticated: boolean;
};

const navItems = [
  { href: "/music", label: "Music" },
  { href: "/merch", label: "Merch" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export function DesktopNavLinks({ isAuthenticated }: Props) {
  const pathname = usePathname();

  return (
    <nav className="hidden items-center gap-2 text-sm md:flex">
      {navItems.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`nav-link ${active ? "nav-link-active" : ""}`}
          >
            {item.label}
          </Link>
        );
      })}

      {isAuthenticated ? (
        <Link href="/admin/dashboard" className="btn-gold ml-1 rounded-full px-3.5 py-1.5">
          Admin
        </Link>
      ) : (
        <Link href="/login" className="btn-outline ml-1 rounded-full px-3.5 py-1.5">
          Login
        </Link>
      )}
    </nav>
  );
}
