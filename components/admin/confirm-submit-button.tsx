"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  targetSubmitId: string;
  label: string;
  title?: string;
  description?: string;
  className?: string;
  confirmLabel?: string;
  cancelLabel?: string;
};

export function ConfirmSubmitButton({
  targetSubmitId,
  label,
  title = "Confirm Action",
  description = "This action cannot be undone.",
  className,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
}: Props) {
  const [open, setOpen] = useState(false);
  const cancelRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    const timer = window.setTimeout(() => cancelRef.current?.focus(), 0);
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function onConfirm() {
    const target = document.getElementById(targetSubmitId);
    if (target instanceof HTMLButtonElement) {
      target.click();
    }
    setOpen(false);
  }

  return (
    <>
      <button type="button" className={className} onClick={() => setOpen(true)}>
        {label}
      </button>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-[2px]">
          <div role="dialog" aria-modal="true" className="w-full max-w-md rounded-xl border border-white/10 bg-zinc-950 p-5">
            <h3 className="text-lg font-semibold text-white">{title}</h3>
            <p className="mt-2 text-sm text-zinc-300">{description}</p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                ref={cancelRef}
                type="button"
                onClick={() => setOpen(false)}
                className="btn-soft rounded-full px-3 py-1.5 text-sm"
              >
                {cancelLabel}
              </button>
              <button
                type="button"
                onClick={onConfirm}
                className="btn-danger rounded-full px-3 py-1.5 text-sm"
              >
                {confirmLabel}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
