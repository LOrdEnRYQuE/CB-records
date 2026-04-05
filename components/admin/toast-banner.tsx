type Props = {
  success?: string;
  error?: string;
};

export function ToastBanner({ success, error }: Props) {
  if (!success && !error) {
    return null;
  }

  if (error) {
    return (
      <p className="mb-4 rounded-lg border border-red-400/40 bg-red-500/15 px-3 py-2 text-sm text-red-200">
        {error}
      </p>
    );
  }

  return (
    <p className="mb-4 rounded-lg border border-emerald-400/40 bg-emerald-500/15 px-3 py-2 text-sm text-emerald-200">
      {success}
    </p>
  );
}
