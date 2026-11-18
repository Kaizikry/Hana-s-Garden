import { describe, expect, it } from "vitest";
import { STARTER_PLANTS } from "../src/data/plants";
import { inquiryTime, isValidPhone, money, pickupDays, roundCents, toWhatsAppNumber } from "../src/lib/format";
import { fitWithin } from "../src/lib/image";
import { pageItems, paginate, shopOrder } from "../src/lib/pages";
import { basketTotal, buildMessage, whatsappUrl } from "../src/lib/whatsapp";
import type { Plant } from "../src/types";

describe("pages", () => {
  const forty = Array.from({ length: 40 }, (_, i) => i + 1);

  it("splits a list into pages, the last one partly full", () => {
    expect(paginate(forty, 1, 12)).toEqual({ items: forty.slice(0, 12), page: 1, pages: 4 });
    expect(paginate(forty, 4, 12).items).toEqual([37, 38, 39, 40]);
  });

  it("keeps a page number from the address within range", () => {
    expect(paginate(forty, 99, 12).page).toBe(4);
    expect(paginate(forty, 0, 12).page).toBe(1);
    expect(paginate(forty, Number("abc"), 12).page).toBe(1);
    expect(paginate(forty, 2.7, 12).page).toBe(2);
  });

  it("treats an empty list as one empty page", () => {
    expect(paginate([], 3, 12)).toEqual({ items: [], page: 1, pages: 1 });
  });

  it("shows every page number when there are 7 or fewer", () => {
    expect(pageItems(1, 1)).toEqual([1]);
    expect(pageItems(2, 4)).toEqual([1, 2, 3, 4]);
    expect(pageItems(7, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it("shortens long runs of page numbers with gaps", () => {
    // Near either end the row stays the same width, so the buttons don't shift between nearby pages.
    expect(pageItems(1, 12)).toEqual([1, 2, 3, 4, "…", 12]);
    expect(pageItems(3, 12)).toEqual([1, 2, 3, 4, "…", 12]);
    expect(pageItems(6, 12)).toEqual([1, "…", 5, 6, 7, "…", 12]);
    expect(pageItems(12, 12)).toEqual([1, "…", 9, 10, 11, 12]);
  });

  it("orders the shop in stock first, newest first", () => {
    const plant = (id: string, stock: number, status: Plant["status"] = "Available") => ({ id, stock, status }) as Plant;
    // The Sheet keeps plants oldest first.
    const sheet = [plant("old", 2), plant("sold", 0), plant("mid", 5), plant("gone", 3, "Sold Out"), plant("new", 1)];
    expect(shopOrder(sheet).map((p) => p.id)).toEqual(["new", "mid", "old", "gone", "sold"]);
    expect(sheet[0].id).toBe("old"); // the store's own list is left alone
  });
});

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

  it("offers 7 days, starting today", () => {
    const days = pickupDays(saturdayMorning);
    expect(days).toHaveLength(7);
    expect(days[0]).toEqual({ label: "Today", date: "7 Nov", value: "Saturday, 7 Nov" });
    expect(days[1]).toMatchObject({ label: "Tomorrow", value: "Sunday, 8 Nov" });
    expect(days[2]).toMatchObject({ label: "Monday", date: "9 Nov" });
  });

  it("leaves out today once the garden has closed", () => {
    const [first] = pickupDays(new Date(2026, 10, 7, 18, 0));
    expect(first).toMatchObject({ label: "Tomorrow", date: "8 Nov" });
  });

  it("crosses into the next month", () => {
    expect(pickupDays(new Date(2026, 10, 30, 10, 0))[1].date).toBe("1 Dec");
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
  it("uses am and pm", () => {
    expect(inquiryTime(new Date(2026, 10, 7, 14, 5).toISOString())).toBe("7 Nov, 2:05 pm");
    expect(inquiryTime(new Date(2026, 10, 7, 0, 30).toISOString())).toBe("7 Nov, 12:30 am");
  });
});

describe("WhatsApp message", () => {
  const inquiry = {
    customerName: "Aisha & Co",
    customerPhone: "0123456789",
    pickupPreference: "Monday, 9 Nov · 9–11am",
    items: [
      { id: "a", name: "Aloe Vera", price: 8, qty: 2 },
      { id: "b", name: "Spotted Bromeliad", price: 12.5, qty: 1 },
    ],
    totalPrice: 28.5,
    notes: "",
  };

  it("matches the design's format", () => {
    expect(buildMessage("Hana's Garden", inquiry, "INQ-1")).toBe(
      [
        "Hi Hana's Garden, I'd like to ask about these plants:",
        "",
        "1. Aloe Vera × 2 = RM 16",
        "2. Spotted Bromeliad × 1 = RM 12.50",
        "",
        "Estimated total: RM 28.50",
        "Self pickup: Monday, 9 Nov · 9–11am",
        "Name: Aisha & Co",
        "Phone: 0123456789",
        "",
        "Reference: INQ-1",
        "Thank you!",
      ].join("\n"),
    );
  });

  it("adds notes only when there are some", () => {
    expect(buildMessage("Shop", inquiry)).not.toContain("Notes:");
    expect(buildMessage("Shop", { ...inquiry, notes: "Full leaves" })).toContain("Notes: Full leaves");
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
