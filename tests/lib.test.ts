import { describe, expect, it } from "vitest";
import { STARTER_PLANTS } from "../src/data/plants";
import { inquiryTime, isValidPhone, money, pickupDays, roundCents, toWhatsAppNumber } from "../src/lib/format";
import { fitWithin } from "../src/lib/image";
import { basketTotal, buildMessage, whatsappUrl } from "../src/lib/whatsapp";

describe("money", () => {
  it("drops cents only for whole amounts", () => {
    expect(money(45)).toBe("RM 45");
    expect(money(12.5)).toBe("RM 12.50");
  });

  it("avoids floating point drift in totals", () => {
    expect(roundCents(0.1 + 0.2)).toBe(0.3);
    expect(basketTotal([{ price: 19.99, qty: 3 }, { price: 0.1, qty: 2 }])).toBe(60.17);
  });
});

describe("pickup days", () => {
  const saturdayMorning = new Date(2026, 10, 7, 10, 0);

  it("offers 7 days in Malay, starting today", () => {
    const days = pickupDays(saturdayMorning);
    expect(days).toHaveLength(7);
    expect(days[0]).toEqual({ label: "Hari ini", date: "7 Nov", value: "Sabtu, 7 Nov" });
    expect(days[1]).toMatchObject({ label: "Esok", value: "Ahad, 8 Nov" });
    expect(days[2]).toMatchObject({ label: "Isnin", date: "9 Nov" });
  });

  it("leaves out today once the garden has closed", () => {
    const [first] = pickupDays(new Date(2026, 10, 7, 18, 0));
    expect(first).toMatchObject({ label: "Esok", date: "8 Nov" });
  });

  it("crosses into the next month", () => {
    expect(pickupDays(new Date(2026, 10, 30, 10, 0))[1].date).toBe("1 Dis");
  });
});

describe("phone numbers", () => {
  it.each(["012-345 6789", "+60 12-345 6789", "(012) 3456789"])("accepts %s", (phone) => {
    expect(isValidPhone(phone)).toBe(true);
  });
  it.each(["", "abc", "12345", "012345678901234567", "012345678x"])("rejects %j", (phone) => {
    expect(isValidPhone(phone)).toBe(false);
  });
  it("converts local numbers for wa.me", () => {
    expect(toWhatsAppNumber("013-928 4410")).toBe("60139284410");
    expect(toWhatsAppNumber("+60 13-928 4410")).toBe("60139284410");
  });
});

describe("inquiry time", () => {
  it("uses the Malay morning and afternoon markers", () => {
    expect(inquiryTime(new Date(2026, 10, 7, 14, 5).toISOString())).toBe("7 Nov, 2:05 ptg");
    expect(inquiryTime(new Date(2026, 10, 7, 0, 30).toISOString())).toBe("7 Nov, 12:30 pg");
  });
});

describe("WhatsApp message", () => {
  const inquiry = {
    customerName: "Aisha & Co",
    customerPhone: "0123456789",
    pickupPreference: "Isnin, 9 Nov · 9–11 pagi",
    items: [
      { id: "a", name: "Aloe Vera", price: 8, qty: 2 },
      { id: "b", name: "Bromelia Bintik", price: 12.5, qty: 1 },
    ],
    totalPrice: 28.5,
    notes: "",
  };

  it("matches the design's format", () => {
    expect(buildMessage("Hana's Garden", inquiry, "INQ-1")).toBe(
      [
        "Salam Hana's Garden, saya nak buat pertanyaan untuk pokok berikut:",
        "",
        "1. Aloe Vera × 2 = RM 16",
        "2. Bromelia Bintik × 1 = RM 12.50",
        "",
        "Jumlah anggaran: RM 28.50",
        "Ambil sendiri: Isnin, 9 Nov · 9–11 pagi",
        "Nama: Aisha & Co",
        "Telefon: 0123456789",
        "",
        "Rujukan: INQ-1",
        "Terima kasih!",
      ].join("\n"),
    );
  });

  it("adds notes only when there are some", () => {
    expect(buildMessage("Kedai", inquiry)).not.toContain("Nota:");
    expect(buildMessage("Kedai", { ...inquiry, notes: "Daun lebat" })).toContain("Nota: Daun lebat");
  });

  it("encodes the URL so symbols and newlines survive", () => {
    expect(whatsappUrl("60 12-345", "Aisha & Co\n100%")).toBe("https://wa.me/6012345?text=Aisha%20%26%20Co%0A100%25");
  });
});

describe("photo resizing", () => {
  it("scales wide photos down to 800px", () => {
    expect(fitWithin(4000, 3000)).toEqual({ width: 800, height: 600 });
  });
  it("also limits tall phone photos", () => {
    expect(fitWithin(3000, 4000)).toEqual({ width: 750, height: 1000 });
  });
  it("never enlarges small photos", () => {
    expect(fitWithin(300, 200)).toEqual({ width: 300, height: 200 });
  });
});

describe("starter plants", () => {
  it("uses each of the 14 photos exactly once", () => {
    const photos = new Set(STARTER_PLANTS.map((p) => p.imageUrl));
    expect(photos.size).toBe(14);
    for (let i = 1; i <= 14; i++) expect(photos).toContain(`images/bromelia-${String(i).padStart(2, "0")}.jpeg`);
  });
});
