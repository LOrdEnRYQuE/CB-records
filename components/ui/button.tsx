import type { ButtonHTMLAttributes } from "react";
import clsx from "clsx";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
};

export function Button({ className, variant = "primary", ...props }: Props) {
  return (
    <button
      className={clsx(
        "inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-semibold transition",
        {
          "bg-gold-500 text-black hover:bg-gold-400": variant === "primary",
          "border border-white/20 bg-white/5 text-white hover:bg-white/10": variant === "secondary",
          "text-zinc-300 hover:text-white": variant === "ghost",
        },
        className,
      )}
      {...props}
    />
  );
}
