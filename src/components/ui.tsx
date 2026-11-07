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

/** A photo, or a blank arch for plants that don't have one yet or whose photo fails to load. */
export function Photo({ plant, src }: { plant: Pick<Plant, "name" | "imageUrl">; src?: string }) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const url = src ?? plant.imageUrl;
  if (!url || failedUrl === url) return <div className="photo-empty">Foto akan datang</div>;
  return <img src={url} alt={plant.name} loading="lazy" referrerPolicy="no-referrer" onError={() => setFailedUrl(url)} />;
}

export function stockText(plant: Plant) {
  if (plant.status === "Sold Out" || plant.stock <= 0) return "Habis dijual";
  return plant.stock <= 3 ? `Tinggal ${plant.stock} sahaja` : `${plant.stock} dalam stok`;
}

export function Stepper({ value, max, label, onChange }: { value: number; max: number; label: string; onChange: (n: number) => void }) {
  return (
    <div className="stepper" role="group" aria-label={`Kuantiti ${label}`}>
      <button type="button" onClick={() => onChange(value - 1)} aria-label={`Kurangkan ${label}`}>−</button>
      <output>{value}</output>
      <button type="button" onClick={() => onChange(value + 1)} disabled={value >= max} aria-label={`Tambah ${label}`}>+</button>
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
