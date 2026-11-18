import type { ReactNode } from "react";
import { pageItems } from "../lib/pages";

interface Props {
  page: number;
  pages: number;
  /** Links, for the shop, so the page is in the address and Back returns to it. */
  hrefFor?: (page: number) => string;
  /** Buttons, for admin, where the page doesn't need to survive a reload. */
  onPick?: (page: number) => void;
}

export function Pager({ page, pages, hrefFor, onPick }: Props) {
  if (pages <= 1) return null;

  const go = (n: number, label: string, content: ReactNode, current = false) => {
    const off = n < 1 || n > pages;
    const common = { className: current ? "is-current" : undefined, "aria-label": label, "aria-current": current ? ("page" as const) : undefined };
    if (off) return <span className="pager-off" aria-hidden="true">{content}</span>;
    return hrefFor
      ? <a href={hrefFor(n)} {...common}>{content}</a>
      : <button type="button" onClick={() => onPick?.(n)} {...common}>{content}</button>;
  };

  return (
    <nav className="pager" aria-label="Pages">
      <div className="pager-row">
        {go(page - 1, "Previous page", "‹")}
        {pageItems(page, pages).map((n, i) =>
          n === "…" ? <span key={`gap${i}`} className="pager-gap">…</span> : <span key={n}>{go(n, `Page ${n}`, n, n === page)}</span>,
        )}
        {go(page + 1, "Next page", "›")}
      </div>
      <p className="muted small">Page {page} of {pages}</p>
    </nav>
  );
}
