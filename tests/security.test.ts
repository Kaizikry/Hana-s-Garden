import { describe, expect, it } from "vitest";
import { loadBackend } from "./fakeAppsScript";

/** What an outsider can try against the public endpoint, with no passcode. */
const PIN = "482193";
const NUMBER = "60139990000";

function shop(extra: Record<string, string> = {}) {
  const api = loadBackend({ ADMIN_PIN: PIN, WHATSAPP_NUMBER: NUMBER, ...extra });
  const token = api.post({ action: "VERIFY_PIN", adminPin: PIN }).token as string;
  const { plantId } = api.post({ action: "SAVE_PLANT", token, plant: { name: "Bromelia", category: "Luar Rumah", price: 25, stock: 3 } });
  const inquiry = { action: "SUBMIT_INQUIRY", customerName: "Pelanggan", customerPhone: "0123456789", pickupPreference: "Esok", notes: "", items: [{ id: plantId, qty: 1 }] };
  return { api, token, plantId, inquiry, list: () => api.post({ action: "LIST_INQUIRIES", token }) };
}

describe("access control", () => {
  const adminActions = ["LOGOUT", "LIST_INQUIRIES", "SAVE_PLANT", "DELETE_PLANT", "SET_INQUIRY_STATUS", "DROP_ALL"];

  it.each(adminActions)("refuses %s with no session", (action) => {
    const { api } = shop();
    expect(api.post({ action, plant: { name: "x" } }).code).toBe("BAD_SESSION");
  });

  it.each([
    ["a made-up token", "00000000-0000-0000-0000-000000000000"],
    ["an array", ["x"]],
    ["an object", { a: 1 }],
    ["the passcode itself", PIN],
    ["an empty string", ""],
  ])("refuses %s as a session", (_label, token) => {
    const { api } = shop();
    expect(api.post({ action: "LIST_INQUIRIES", token }).code).toBe("BAD_SESSION");
  });

  it("refuses a session after it expires", () => {
    const { api, token } = shop();
    api.cache.delete(`session:${token}`);
    expect(api.post({ action: "LIST_INQUIRIES", token }).code).toBe("BAD_SESSION");
  });

  it("never returns customer details or the passcode publicly", () => {
    const { api, inquiry } = shop();
    api.post(inquiry);
    const publicData = JSON.stringify(api.get());
    expect(publicData).not.toContain("Pelanggan");
    expect(publicData).not.toContain("0123456789");
    expect(publicData).not.toContain(PIN);
  });
});

describe("passcode guessing", () => {
  it("only accepts the passcode as plain text", () => {
    const { api } = shop();
    expect(api.post({ action: "VERIFY_PIN", adminPin: [PIN] }).code).toBe("BAD_PIN");
    expect(api.post({ action: "VERIFY_PIN", adminPin: Number(PIN) }).code).toBe("BAD_PIN");
  });

  it("keeps the lock even if the cache is wiped", () => {
    const { api } = shop();
    for (let i = 0; i < 5; i++) api.post({ action: "VERIFY_PIN", adminPin: "bad" });
    api.cache.clear();
    expect(api.post({ action: "VERIFY_PIN", adminPin: PIN }).code).toBe("LOCKED");
  });

  it("lets a guesser try at most 5 times while locked out", () => {
    const { api } = shop();
    const results = Array.from({ length: 50 }, () => api.post({ action: "VERIFY_PIN", adminPin: "000000" }).code);
    expect(results.filter((code) => code === "BAD_PIN")).toHaveLength(5);
    expect(results.at(-1)).toBe("LOCKED");
  });

  it("doesn't log out someone already signed in when an attacker triggers the lock", () => {
    const { api, token } = shop();
    for (let i = 0; i < 5; i++) api.post({ action: "VERIFY_PIN", adminPin: "bad" });
    expect(api.post({ action: "LIST_INQUIRIES", token }).status).toBe("success");
  });
});

describe("hostile inquiries", () => {
  it("can't hide other inquiries with an oversized basket", () => {
    const { api, inquiry, list, plantId } = shop();
    api.post(inquiry);
    api.post({ ...inquiry, items: Array.from({ length: 5000 }, () => ({ id: plantId, name: "N".repeat(1000), qty: 1 })) });
    expect(list().status).toBe("success");
    expect(list().inquiries.length).toBeGreaterThanOrEqual(1);
  });

  it("still lists inquiries when a row is damaged", () => {
    const { api, inquiry, list } = shop();
    api.post(inquiry);
    api.sheets.get("Inquiries")![1][5] = '[{"id":"unterminated';
    api.post(inquiry);
    const { inquiries } = list();
    expect(inquiries).toHaveLength(2);
    expect(inquiries[0].items).toEqual([]);
  });

  it.each([[[null, 5, "x"]], [[{}]], [[{ id: "nope", qty: 1 }]], ["not a list"], [null]])("rejects garbage items: %j", (items) => {
    const { api, inquiry } = shop();
    expect(api.post({ ...inquiry, items }).status).toBe("error");
    expect(api.sheets.get("Inquiries")).toHaveLength(1);
  });

  it("uses the sheet's name and price, not the request's", () => {
    const { api, inquiry, list, plantId } = shop();
    api.post({ ...inquiry, items: [{ id: plantId, name: "Percuma", price: 0.01, qty: 2 }], totalPrice: 0.01 });
    const [record] = list().inquiries;
    expect(record.totalPrice).toBe(50);
    expect(record.items[0]).toEqual({ id: plantId, name: "Bromelia", price: 25, qty: 2 });
  });

  it.each([[-5], [0], ["abc"], [null]])("ignores a nonsense quantity: %j", (qty) => {
    const { api, inquiry, plantId } = shop();
    expect(api.post({ ...inquiry, items: [{ id: plantId, qty }] }).status).toBe("error");
  });

  it("caps huge quantities", () => {
    const { api, inquiry, list, plantId } = shop();
    api.post({ ...inquiry, items: [{ id: plantId, qty: 1e9 }] });
    expect(list().inquiries[0].items[0].qty).toBe(99);
  });

  it("limits a flood, and the emails with it", () => {
    const { api, inquiry } = shop({ NOTIFY_EMAIL: "owner@example.com" });
    const accepted = Array.from({ length: 500 }, () => api.post(inquiry)).filter((r) => r.status === "success");
    expect(accepted).toHaveLength(30);
    expect(api.sentEmails).toHaveLength(30);
  });

  it.each([["=1+1"], [" =1+1"], ["\n=1+1"], ["\t=1+1"], ["+1"], ["-1"], ["@SUM(A1)"], ["|cmd"], ["＝1+1"]])("neutralises the formula %j in every customer field", (text) => {
    const { api, inquiry } = shop();
    api.post({ ...inquiry, customerName: text, customerPhone: text, pickupPreference: text, notes: text });
    const row = api.sheets.get("Inquiries")!.at(-1)!;
    for (const column of [2, 3, 4, 7]) expect(row[column]).toBe(`'${text}`);
  });

  it("keeps a new line out of the email subject", () => {
    const { api, inquiry } = shop({ NOTIFY_EMAIL: "owner@example.com" });
    api.post({ ...inquiry, customerName: "Hi\nBcc: victim@example.com" });
    expect((api.sentEmails[0] as { subject: string }).subject).not.toContain("\n");
  });

  it("caps long text", () => {
    const { api, inquiry } = shop();
    api.post({ ...inquiry, notes: "x".repeat(100000) });
    expect(String(api.sheets.get("Inquiries")!.at(-1)![7]).length).toBeLessThanOrEqual(1001);
  });

  it("isn't fooled by prototype keys", () => {
    const { api, inquiry } = shop();
    expect(api.post({ ...inquiry, items: [{ id: "__proto__", qty: 1 }] }).status).toBe("error");
    expect(api.post({ ...inquiry, items: [{ id: "constructor", qty: 1 }] }).status).toBe("error");
    api.postRaw(JSON.stringify(inquiry).replace('"action"', '"__proto__":{"admin":true},"action"'));
    expect(({} as Record<string, unknown>).admin).toBeUndefined();
  });
});

describe("information leaks", () => {
  it.each([["{not json"], ["null"], ["[]"], ['"text"'], [""]])("gives a plain error for a malformed request: %j", (body) => {
    const res = loadBackend({ ADMIN_PIN: PIN }).postRaw(body);
    expect(res.status).toBe("error");
    expect(res.message).not.toMatch(/SyntaxError|TypeError|ReferenceError|position|undefined|null/);
  });
});

describe("the shop's number", () => {
  it("comes from private settings, not from the code", () => {
    expect(shop().api.get().whatsappNumber).toBe(NUMBER);
  });
});
