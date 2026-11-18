/**
 * The Sheet stores these Malay values, so plants saved before the site moved to English keep
 * working. Only the labels shown on the site are English.
 */
export const CATEGORIES = ["Dalam Rumah", "Luar Rumah", "Sukulen", "Berbunga", "Herba & Buah"];
const CATEGORY_LABELS: Record<string, string> = {
  "Dalam Rumah": "Indoor",
  "Luar Rumah": "Outdoor",
  Sukulen: "Succulents",
  Berbunga: "Flowering",
  "Herba & Buah": "Herbs & Fruit",
};
export const categoryLabel = (category: string) => CATEGORY_LABELS[category] ?? category;

export type PlantStatus = "Available" | "Sold Out";

/** Mirrors a row in the Inventory sheet. */
export interface Plant {
  id: string;
  name: string;
  altName: string;
  category: string;
  price: number;
  stock: number;
  status: PlantStatus;
  sunlight: string;
  water: string;
  potSize: string;
  description: string;
  imageUrl: string;
}

export interface PlantDraft extends Omit<Plant, "id"> {
  id?: string;
  imageBase64?: string;
}

export const inStock = (plant: Plant) => plant.status !== "Sold Out" && plant.stock > 0;

export interface BasketItem {
  id: string;
  name: string;
  price: number;
  qty: number;
}

export interface Inquiry {
  customerName: string;
  customerPhone: string;
  pickupPreference: string;
  items: BasketItem[];
  totalPrice: number;
  notes: string;
}

/** Stored in the Sheet in Malay, like the categories, and shown in English. */
export type InquiryStatus = "Baru" | "Disahkan" | "Selesai";
export const STATUS_LABELS: Record<InquiryStatus, string> = { Baru: "New", Disahkan: "Confirmed", Selesai: "Done" };

export interface InquiryRecord extends Inquiry {
  inquiryId: string;
  timestamp: string;
  status: InquiryStatus;
}
