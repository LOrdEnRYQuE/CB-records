import type { ReactNode } from "react";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { SignOutForm } from "@/components/admin/sign-out-form";
import { requireAdminAccess } from "@/lib/auth/session";

type Props = {
  children: ReactNode;
};

export default async function AdminLayout({ children }: Props) {
  const { role, user } = await requireAdminAccess("/admin/dashboard");

  return (
    <div className="page-shell min-h-screen md:flex">
      <AdminSidebar />
      <main className="flex-1 px-4 py-5 md:px-8 md:py-8">
        <div className="mx-auto w-full max-w-7xl">
          <div className="panel mb-6 flex min-h-40 flex-col gap-3 rounded-2xl p-4 md:flex-row md:items-center md:justify-between md:p-5">
            <div>
              <p className="eyebrow">Signed in</p>
              <p className="mt-1 text-sm text-zinc-200">{user.email}</p>
              <p className="mt-0.5 text-xs text-zinc-400">Role: {role}</p>
            </div>
            <SignOutForm />
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}
