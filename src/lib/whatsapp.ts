import type { Inquiry } from "../types";
import { money, roundCents } from "./format";

export function basketTotal(items: { price: number; qty: number }[]): number {
  return roundCents(items.reduce((sum, item) => sum + item.price * item.qty, 0));
}

export function buildMessage(shopName: string, inquiry: Inquiry, inquiryId?: string): string {
  return [
    `Salam ${shopName}, saya nak buat pertanyaan untuk pokok berikut:`,
    "",
    ...inquiry.items.map((item, i) => `${i + 1}. ${item.name} × ${item.qty} = ${money(item.price * item.qty)}`),
    "",
    `Jumlah anggaran: ${money(inquiry.totalPrice)}`,
    `Ambil sendiri: ${inquiry.pickupPreference}`,
    `Nama: ${inquiry.customerName}`,
    `Telefon: ${inquiry.customerPhone}`,
    ...(inquiry.notes ? [`Nota: ${inquiry.notes}`] : []),
    "",
    ...(inquiryId ? [`Rujukan: ${inquiryId}`] : []),
    "Terima kasih!",
  ].join("\n");
}

export function whatsappUrl(number: string, message: string): string {
  return `https://wa.me/${number.replace(/\D/g, "")}?text=${encodeURIComponent(message)}`;
}
