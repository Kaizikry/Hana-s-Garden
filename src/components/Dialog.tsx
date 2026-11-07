import { useEffect, useRef, type ReactNode } from "react";

/**
 * Native <dialog>, which gives us focus trapping and Escape handling for free.
 * `variant` only changes placement: a centred modal or a drawer on the right edge.
 */
export function Dialog({
  open,
  onClose,
  label,
  variant = "modal",
  children,
}: {
  open: boolean;
  onClose: () => void;
  label: string;
  variant?: "modal" | "drawer";
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className={`dialog dialog-${variant}`}
      aria-label={label}
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        // A click whose target is the dialog element itself landed on the backdrop.
        if (e.target === ref.current) onClose();
      }}
    >
      {open && <div className="dialog-body">{children}</div>}
    </dialog>
  );
}
