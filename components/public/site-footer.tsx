export function SiteFooter() {
  return (
    <footer className="border-t border-white/10 bg-gradient-to-b from-black/70 to-black/85">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-2 px-4 py-5 text-xs text-zinc-400 md:flex-row md:items-center md:justify-between md:px-6 md:py-6 md:text-sm">
        <p>© {new Date().getFullYear()} ATTA AI Records. All rights reserved.</p>
        <p className="uppercase tracking-wide">Cartieru&apos; Bradet • Booking & Collaborations Open</p>
      </div>
    </footer>
  );
}
