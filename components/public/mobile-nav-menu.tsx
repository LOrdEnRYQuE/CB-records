"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type Props = {
  isAuthenticated: boolean;
};

export function MobileNavMenu({ isAuthenticated }: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    if (!open) {
      return;
    }

    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node | null;
      if (!target || !rootRef.current?.contains(target)) {
        setOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    window.addEventListener("mousedown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative md:hidden">
      <button
        type="button"
        aria-label="Open navigation menu"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        className="btn-soft rounded-md px-3 py-1.5 text-xs"
      >
        Menu
      </button>

      {open ? (
        <nav className="absolute right-0 mt-2 w-48 rounded-xl border border-white/15 bg-black/95 p-2 text-sm text-zinc-200 shadow-xl">
          <Link
            href="/music"
            onClick={() => setOpen(false)}
            className={`block rounded px-2 py-1.5 transition hover:bg-white/5 ${pathname.startsWith("/music") ? "bg-gold-500/10 text-gold-200" : ""}`}
          >
            Music
          </Link>
          <Link
            href="/merch"
            onClick={() => setOpen(false)}
            className={`block rounded px-2 py-1.5 transition hover:bg-white/5 ${pathname.startsWith("/merch") ? "bg-gold-500/10 text-gold-200" : ""}`}
          >
            Merch
          </Link>
          <Link
            href="/about"
            onClick={() => setOpen(false)}
            className={`block rounded px-2 py-1.5 transition hover:bg-white/5 ${pathname === "/about" ? "bg-gold-500/10 text-gold-200" : ""}`}
          >
            About
          </Link>
          <Link
            href="/contact"
            onClick={() => setOpen(false)}
            className={`block rounded px-2 py-1.5 transition hover:bg-white/5 ${pathname === "/contact" ? "bg-gold-500/10 text-gold-200" : ""}`}
          >
            Contact
          </Link>
          {isAuthenticated ? (
            <Link href="/admin/dashboard" onClick={() => setOpen(false)} className="mt-1 block rounded bg-gold-500/15 px-2 py-1.5 text-gold-200">
              Admin
            </Link>
          ) : (
            <Link href="/login" onClick={() => setOpen(false)} className="mt-1 block rounded border border-white/20 px-2 py-1.5 text-zinc-100">
              Login
            </Link>
          )}
        </nav>
      ) : null}
    </div>
  );
}
