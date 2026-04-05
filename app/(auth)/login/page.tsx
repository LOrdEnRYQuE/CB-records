import Link from "next/link";
import Image from "next/image";
import { signInAction } from "@/app/(auth)/login/actions";

type Props = {
  searchParams: Promise<{ next?: string; error?: string }>;
};

const errorMap: Record<string, string> = {
  "invalid-credentials": "Invalid email or password.",
  "missing-supabase-config": "Supabase environment variables are missing.",
  "missing-role": "Your account has no role assigned. Contact an admin.",
};

export default async function LoginPage({ searchParams }: Props) {
  const params = await searchParams;
  const next = params.next || "/admin/dashboard";
  const errorText = params.error ? errorMap[params.error] ?? "Sign-in failed." : null;

  return (
    <main className="page-shell flex min-h-screen items-center justify-center px-6 py-10">
      <div className="grid w-full max-w-6xl overflow-hidden rounded-3xl border border-white/10 bg-black/55 shadow-[0_0_60px_rgba(212,175,55,0.14)] backdrop-blur md:grid-cols-[1fr_420px]">
        <section className="relative hidden min-h-[620px] overflow-hidden md:block">
          <Image
            src="/Banners.png"
            alt="ATTA visual"
            fill
            priority
            className="object-cover opacity-75"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-black/40 via-black/70 to-black/90" />
          <div className="relative z-10 flex h-full flex-col justify-between p-10">
            <div className="inline-flex items-center gap-3">
              <div className="relative h-10 w-10 overflow-hidden rounded-full border border-gold-500/40 bg-black">
                <Image src="/LOGO Cartieru` Bradet.png" alt="ATTA logo" fill className="object-contain p-1" />
              </div>
              <p className="text-sm uppercase tracking-[0.2em] text-gold-400">ATTA</p>
            </div>

            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-zinc-300">Admin Access</p>
              <h1 className="mt-3 text-5xl font-black leading-tight text-white">ATTA AI Records Control Room</h1>
              <p className="mt-4 max-w-md text-zinc-300">
                Manage albums, tracks, media, settings, and audit logs from one secured dashboard.
              </p>
            </div>
          </div>
        </section>

        <section className="flex min-h-[620px] flex-col justify-center bg-zinc-950/82 p-6 md:p-8">
          <div className="mb-6 md:hidden">
            <p className="text-xs uppercase tracking-[0.2em] text-gold-400">ATTA Admin</p>
            <h1 className="mt-2 text-3xl font-black">Control Room Login</h1>
          </div>

          <p className="eyebrow">Secure Access</p>
          <h2 className="section-title mt-2">Sign In</h2>
          <p className="mt-1 text-sm text-zinc-300">Use your Supabase credentials.</p>

          {errorText ? <p className="mt-4 rounded-md border border-red-500/30 bg-red-500/15 p-3 text-sm text-red-200">{errorText}</p> : null}

          <form action={signInAction} className="mt-5 space-y-4">
            <input type="hidden" name="next" value={next} />
            <label className="block space-y-1 text-sm">
              <span className="text-zinc-200">Email</span>
              <input
                required
                type="email"
                name="email"
                className="field w-full"
              />
            </label>

            <label className="block space-y-1 text-sm">
              <span className="text-zinc-200">Password</span>
              <input
                required
                type="password"
                name="password"
                className="field w-full"
              />
            </label>

            <button type="submit" className="btn-gold w-full rounded-md px-4 py-2">
              Sign In
            </button>
          </form>

          <p className="mt-4 text-center text-sm text-zinc-400">
            Back to{" "}
            <Link href="/" className="text-gold-400 hover:text-gold-500">
              website
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}
