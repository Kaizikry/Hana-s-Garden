import type { Inquiry } from "../types";
import { money, roundCents } from "./format";

export function basketTotal(items: { price: number; qty: number }[]): number {
  return roundCents(items.reduce((sum, item) => sum + item.price * item.qty, 0));
}

export function buildMessage(shopName: string, inquiry: Inquiry, inquiryId?: string): string {
  return [
    `Hi ${shopName}, I'd like to ask about these plants:`,
    "",
    ...inquiry.items.map((item, i) => `${i + 1}. ${item.name} × ${item.qty} = ${money(item.price * item.qty)}`),
    "",
    `Estimated total: ${money(inquiry.totalPrice)}`,
    `Self pickup: ${inquiry.pickupPreference}`,
    `Name: ${inquiry.customerName}`,
    `Phone: ${inquiry.customerPhone}`,
    ...(inquiry.notes ? [`Notes: ${inquiry.notes}`] : []),
    "",
    ...(inquiryId ? [`Reference: ${inquiryId}`] : []),
    "Thank you!",
  ].join("\n");
}

export function whatsappUrl(number: string, message: string): string {
  return `https://wa.me/${number.replace(/\D/g, "")}?text=${encodeURIComponent(message)}`;
}
