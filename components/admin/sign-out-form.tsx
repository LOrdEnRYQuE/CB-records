import { signOutAction } from "@/app/admin/actions";

export function SignOutForm() {
  return (
    <form action={signOutAction}>
      <button
        type="submit"
        className="btn-outline rounded-full px-3 py-2 text-xs font-semibold uppercase tracking-wide"
      >
        Sign Out
      </button>
    </form>
  );
}
