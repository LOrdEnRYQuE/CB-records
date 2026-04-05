type Props = {
  value: boolean;
  trueLabel?: string;
  falseLabel?: string;
};

export function StatusBadge({ value, trueLabel = "Published", falseLabel = "Draft" }: Props) {
  return (
    <span
      className={value
        ? "rounded-full border border-emerald-400/40 bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-200"
        : "rounded-full border border-zinc-500/40 bg-zinc-500/10 px-2 py-0.5 text-xs text-zinc-300"}
    >
      {value ? trueLabel : falseLabel}
    </span>
  );
}
