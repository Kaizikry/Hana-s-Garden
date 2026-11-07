/** Shop settings. Everything here is public, so the admin passcode never goes in this file. */
export const config = {
  shopName: "Hana's Garden",
  ownerName: "Hana",
  pickupPlace: "Kampung Undang",
  pickupArea: "Kampung Undang, Terengganu",
  pickupHours: "Setiap hari, 9 pagi – 5 petang",
  pickupWindows: ["9–11 pagi", "11 pagi–1 tgh hari", "2–5 petang"],
  currency: "RM",

  /** Country code and digits only, like "60123456789". While empty, nothing is sent to WhatsApp. */
  whatsappNumber: "",

  /** The Apps Script Web App URL ending in /exec. While empty, the site runs on sample plants. */
  appsScriptUrl: (import.meta.env.VITE_APPS_SCRIPT_URL as string | undefined) ?? "",
};

export const PIN_LENGTH = 6;
export const DEMO_PIN = "123456";
export const isDemo = !config.appsScriptUrl;
export const hasWhatsApp = /^\d{8,15}$/.test(config.whatsappNumber);
