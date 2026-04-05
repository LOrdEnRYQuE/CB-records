"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

type Props = {
  isAuthenticated: boolean;
};

function NavItem({ href, label }: { href: string; label: string }) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link href={href} className={`nav-link ${active ? "nav-link-active" : ""}`}>
      {label}
    </Link>
  );
}

export function DesktopSplitNav({ isAuthenticated }: Props) {
  return (
    <div className="hidden w-full items-center justify-center md:grid md:grid-cols-[330px_128px_330px] md:gap-3">
      <nav className="flex w-full items-center justify-center gap-1.5 rounded-full border border-white/16 bg-black/52 px-2.5 py-1.5 backdrop-blur-md">
        <NavItem href="/music" label="Music" />
        <NavItem href="/merch" label="Merch" />
      </nav>

      <Link
        href="/"
        className="group relative mx-auto inline-flex h-[5.2rem] w-[5.2rem] items-center justify-center overflow-hidden rounded-full transition hover:scale-[1.02]"
        aria-label="Cartieru Bradet"
      >
        <Image
          src="/LOGO Cartieru` Bradet.png"
          alt="ATTA logo"
          width={84}
          height={84}
          className="relative z-10 h-[5rem] w-[5rem] rounded-full object-contain p-1 brightness-125 contrast-125 saturate-110 drop-shadow-[0_0_14px_rgba(255,255,255,0.08)] transition group-hover:scale-105"
        />
      </Link>

      <nav className="flex w-full items-center justify-center gap-1.5 rounded-full border border-white/16 bg-black/52 px-2.5 py-1.5 backdrop-blur-md">
        <NavItem href="/about" label="About" />
        <NavItem href="/contact" label="Contact" />
        {isAuthenticated ? (
          <Link href="/admin/dashboard" className="btn-gold ml-0.5 rounded-full px-3 py-1.5">
            Admin
          </Link>
        ) : (
          <Link href="/login" className="btn-outline ml-0.5 rounded-full px-3 py-1.5">
            Login
          </Link>
        )}
      </nav>
    </div>
  );
}
