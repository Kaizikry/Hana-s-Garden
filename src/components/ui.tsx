import { useState, type ReactNode } from "react";
import type { Plant } from "../types";

export function Sprout() {
  return (
    <svg className="sprout" viewBox="0 0 32 40" aria-hidden="true">
      <path d="M0 40V16a16 16 0 0 1 32 0v24z" fill="var(--moss)" />
      <path d="M16 32V20c0-5 3-8 8-8 0 5-3 8-8 8m0 3c0-4-3-7-7-7 0 4 3 7 7 7" fill="none" stroke="var(--paper)" strokeWidth="2" />
    </svg>
  );
}

export function BasketIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 3a7 7 0 0 0-7 7v1H2.5l2 10h15l2-10H19v-1a7 7 0 0 0-7-7Zm-5 8v-1a5 5 0 0 1 10 0v1H7Z" />
    </svg>
  );
}

export function WhatsAppIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.16-.17.2-.35.22-.64.08-.3-.15-1.26-.46-2.39-1.48-.88-.79-1.48-1.76-1.65-2.06-.17-.3-.02-.46.13-.6.13-.14.3-.35.45-.52.15-.18.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.61-.92-2.2-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48 0 1.46 1.07 2.88 1.21 3.07.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.7.63.71.22 1.36.19 1.87.12.57-.09 1.76-.72 2-1.41.25-.7.25-1.29.18-1.42-.08-.12-.27-.2-.57-.34m-5.42 7.4h-.01a9.87 9.87 0 0 1-5.03-1.38l-.36-.21-3.74.98 1-3.65-.24-.37a9.86 9.86 0 0 1-1.51-5.26c0-5.45 4.44-9.88 9.89-9.88 2.64 0 5.12 1.03 6.99 2.9a9.83 9.83 0 0 1 2.89 6.99c0 5.45-4.44 9.88-9.88 9.88m8.41-18.3A11.82 11.82 0 0 0 12.05 0C5.5 0 .16 5.34.16 11.89c0 2.1.55 4.14 1.59 5.95L.06 24l6.3-1.65a11.88 11.88 0 0 0 5.68 1.45h.01c6.55 0 11.89-5.34 11.89-11.9a11.82 11.82 0 0 0-3.48-8.4Z" />
    </svg>
  );
}

/** A photo, or a blank arch for plants that don't have one yet or whose photo fails to load. */
export function Photo({ plant, src }: { plant: Pick<Plant, "name" | "imageUrl">; src?: string }) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const url = src ?? plant.imageUrl;
  if (!url || failedUrl === url) return <div className="photo-empty">Photo coming soon</div>;
  return <img src={url} alt={plant.name} loading="lazy" referrerPolicy="no-referrer" onError={() => setFailedUrl(url)} />;
}

/** Sits on a sold-out plant's photo. Hidden from screen readers, which already hear the stock text. */
export function SoldBadge() {
  return <span className="sold-badge" aria-hidden="true">Sold out</span>;
}

export function stockText(plant: Plant) {
  if (plant.status === "Sold Out" || plant.stock <= 0) return "Sold out";
  return plant.stock <= 3 ? `Only ${plant.stock} left` : `${plant.stock} in stock`;
}

export function Stepper({ value, max, label, onChange }: { value: number; max: number; label: string; onChange: (n: number) => void }) {
  return (
    <div className="stepper" role="group" aria-label={`Quantity of ${label}`}>
      <button type="button" onClick={() => onChange(value - 1)} aria-label={`Decrease ${label}`}>−</button>
      <output>{value}</output>
      <button type="button" onClick={() => onChange(value + 1)} disabled={value >= max} aria-label={`Increase ${label}`}>+</button>
    </div>
  );
}

export function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <label className={`field${error ? " has-error" : ""}`}>
      <span>{label}</span>
      {children}
      {error && <em>{error}</em>}
    </label>
  );
}

/** Radio buttons drawn as tiles, so they keep their keyboard behaviour. */
export function Choices<T extends string>({ label, name, options, value, error, onChange }: {
  label: string;
  name: string;
  options: { value: T; label: ReactNode }[];
  value: string;
  error?: string;
  onChange: (value: T) => void;
}) {
  return (
    <fieldset className={`field${error ? " has-error" : ""}`}>
      <legend>{label}</legend>
      <div className="choices">
        {options.map((option) => (
          <label key={option.value} className="choice">
            <input type="radio" name={name} checked={value === option.value} onChange={() => onChange(option.value)} />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
      {error && <em>{error}</em>}
    </fieldset>
  );
}
