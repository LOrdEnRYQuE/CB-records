"use client";

import type { ButtonHTMLAttributes } from "react";
import { useFormStatus } from "react-dom";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  idleLabel: string;
  pendingLabel?: string;
};

export function SubmitButton({
  idleLabel,
  pendingLabel = "Saving...",
  className,
  ...props
}: Props) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending || props.disabled}
      className={className ?? "btn-gold rounded-full px-4 py-2 text-sm"}
      {...props}
    >
      {pending ? pendingLabel : idleLabel}
    </button>
  );
}
