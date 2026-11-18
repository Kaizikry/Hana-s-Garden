/**
 * Shop settings. Everything here is public, so private details never go in this file. The admin
 * passcode and WhatsApp number live in the Apps Script's Script Properties instead.
 */
export const config = {
  shopName: "Hana's Garden",
  ownerName: "Hana",
  pickupPlace: "Hana's house in Kampung Undang, Bukit Payong",
  pickupArea: "Kampung Undang, Bukit Payong",
  pickupHours: "Every day, 9am – 5pm",
  pickupWindows: ["9–11am", "11am–1pm", "2–5pm"],
  currency: "RM",

  /** The Apps Script Web App URL ending in /exec. While empty, the site runs on sample plants. */
  appsScriptUrl: (import.meta.env.VITE_APPS_SCRIPT_URL as string | undefined) ?? "",
};

export const PIN_LENGTH = 6;
export const DEMO_PIN = "123456";
export const isDemo = !config.appsScriptUrl;
