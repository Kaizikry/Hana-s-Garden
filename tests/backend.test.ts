import { describe, expect, it } from "vitest";
import { loadBackend } from "./fakeAppsScript";

const PIN = "482193";
const plant = { name: "Bromelia", altName: "Neoregelia", category: "Luar Rumah", price: 25, stock: 3, status: "Available" };
const customer = { action: "SUBMIT_INQUIRY", customerName: "Pelanggan Ujian", customerPhone: "+60123456789", pickupPreference: "Isnin, 9 Nov · 9–11 pagi", notes: "" };

type Api = ReturnType<typeof loadBackend>;
const login = (api: Api) => api.post({ action: "VERIFY_PIN", adminPin: PIN }).token as string;

/** A shop with one plant, ready for a customer to ask about. */
function shop(properties?: Record<string, string>) {
  const api = loadBackend(properties ?? { ADMIN_PIN: PIN, DRIVE_FOLDER_ID: "folder" });
  const token = login(api);
  const { plantId } = api.post({ action: "SAVE_PLANT", token, plant });
  return { api, token, plantId, inquiry: { ...customer, items: [{ id: plantId, qty: 2 }] } };
}

describe("admin login", () => {
  it("gives a session only for the right passcode", () => {
    const api = loadBackend();
    expect(api.post({ action: "VERIFY_PIN", adminPin: "000000" }).code).toBe("BAD_PIN");
    expect(api.post({ action: "VERIFY_PIN", adminPin: PIN }).token).toEqual(expect.any(String));
  });

  it("locks after repeated failures, even for the right passcode", () => {
    const api = loadBackend();
    for (let i = 0; i < 5; i++) api.post({ action: "VERIFY_PIN", adminPin: "bad" });
    expect(api.post({ action: "VERIFY_PIN", adminPin: PIN }).code).toBe("LOCKED");
  });

  it("refuses to log anyone in until a passcode is configured", () => {
    expect(loadBackend({}).post({ action: "VERIFY_PIN", adminPin: "" }).code).toBe("NOT_CONFIGURED");
  });

  it("ends the session on logout", () => {
    const { api, token } = shop();
    expect(api.post({ action: "LOGOUT", token }).status).toBe("success");
    expect(api.post({ action: "LIST_INQUIRIES", token }).code).toBe("BAD_SESSION");
  });
});

describe("inquiries", () => {
  it("logs an inquiry without logging in, starting as Baru", () => {
    const { api, token, inquiry } = shop();
    const { inquiryId } = api.post(inquiry);
    const [record] = api.post({ action: "LIST_INQUIRIES", token }).inquiries;
    expect(record).toMatchObject({ inquiryId, status: "Baru", totalPrice: 50 });
    expect(record.items[0]).toMatchObject({ name: "Bromelia", qty: 2 });
  });

  it("changes status and rejects unknown ones", () => {
    const { api, token, inquiry } = shop();
    const { inquiryId } = api.post(inquiry);
    expect(api.post({ action: "SET_INQUIRY_STATUS", token, inquiryId, status: "Hacked" }).status).toBe("error");
    expect(api.post({ action: "SET_INQUIRY_STATUS", token, inquiryId, status: "Selesai" }).status).toBe("success");
    expect(api.post({ action: "LIST_INQUIRIES", token }).inquiries[0].status).toBe("Selesai");
  });

  it("changes only the status cell, so customers' text can't become a live formula", () => {
    const { api, token, inquiry } = shop();
    const { inquiryId } = api.post(inquiry);
    api.post({ action: "SET_INQUIRY_STATUS", token, inquiryId, status: "Disahkan" });
    expect(api.rowRewrites).toEqual([]);
  });

  it("rejects an empty basket", () => {
    const { api, inquiry } = shop();
    expect(api.post({ ...inquiry, items: [] }).status).toBe("error");
  });

  it("emails only when an address is configured", () => {
    const silent = shop();
    silent.api.post(silent.inquiry);
    expect(silent.api.sentEmails).toHaveLength(0);

    const notified = shop({ ADMIN_PIN: PIN, NOTIFY_EMAIL: "owner@example.com" });
    notified.api.post(notified.inquiry);
    expect(notified.api.sentEmails).toHaveLength(1);
  });
});

describe("plants", () => {
  it("creates, updates and deletes, keeping stock and the other name", () => {
    const { api, token, plantId } = shop();
    expect(api.get().plants[0]).toMatchObject({ altName: "Neoregelia", stock: 3 });

    api.post({ action: "SAVE_PLANT", token, plant: { ...plant, id: plantId, status: "Sold Out", stock: 0 } });
    expect(api.get().plants).toHaveLength(1);
    expect(api.get().plants[0]).toMatchObject({ id: plantId, status: "Sold Out", stock: 0 });

    expect(api.post({ action: "DELETE_PLANT", token, plantId }).status).toBe("success");
    expect(api.post({ action: "DELETE_PLANT", token, plantId }).status).toBe("error");
    expect(api.get().plants).toEqual([]);
  });

  it("gives plants added back to back different ids", () => {
    const { api, token, plantId } = shop();
    expect(api.post({ action: "SAVE_PLANT", token, plant }).plantId).not.toBe(plantId);
    expect(api.get().plants).toHaveLength(2);
  });

  it("uploads a photo to Drive and stores its public URL", () => {
    const { api, token } = shop();
    const res = api.post({ action: "SAVE_PLANT", token, plant: { ...plant, imageBase64: "data:image/jpeg;base64,AAAA" } });
    expect(res.imageUrl).toContain("id=file1");
    expect(api.uploads).toHaveLength(1);
  });

  it("reports an error instead of silently dropping a photo when Drive isn't set up", () => {
    const { api, token } = shop({ ADMIN_PIN: PIN });
    const res = api.post({ action: "SAVE_PLANT", token, plant: { ...plant, imageBase64: "data:image/jpeg;base64,AAAA" } });
    expect(res.status).toBe("error");
    expect(api.get().plants).toHaveLength(1);
  });
});
