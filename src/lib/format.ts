import { config } from "../config";

const DAYS = ["Ahad", "Isnin", "Selasa", "Rabu", "Khamis", "Jumaat", "Sabtu"];
const MONTHS = ["Jan", "Feb", "Mac", "Apr", "Mei", "Jun", "Jul", "Ogo", "Sep", "Okt", "Nov", "Dis"];
const CLOSING_HOUR = 17;

export const roundCents = (n: number) => Math.round(n * 100) / 100;

export function money(n: number): string {
  const value = roundCents(n);
  return `${config.currency} ${Number.isInteger(value) ? value : value.toFixed(2)}`;
}

export const shortDate = (d: Date) => `${d.getDate()} ${MONTHS[d.getMonth()]}`;

/** The next 7 pickup days. Today is left out once the garden has closed for the day. */
export function pickupDays(now = new Date()) {
  const start = now.getHours() >= CLOSING_HOUR ? 1 : 0;
  return Array.from({ length: 7 }, (_, i) => {
    const offset = start + i;
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset);
    const weekday = DAYS[d.getDay()];
    const label = offset === 0 ? "Hari ini" : offset === 1 ? "Esok" : weekday;
    return { label, date: shortDate(d), value: `${weekday}, ${shortDate(d)}` };
  });
}

export function inquiryTime(iso: string): string {
  const d = new Date(iso);
  const hour = d.getHours() % 12 || 12;
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${shortDate(d)}, ${hour}:${minutes} ${d.getHours() < 12 ? "pg" : "ptg"}`;
}

export function isValidPhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, "");
  return /^[+\d\s()-]+$/.test(phone) && digits.length >= 8 && digits.length <= 15;
}

/** Malaysian numbers are typed with a leading 0, but wa.me needs the country code. */
export function toWhatsAppNumber(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return digits.startsWith("0") ? `6${digits}` : digits;
}
