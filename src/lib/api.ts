import { config, DEMO_PIN, isDemo } from "../config";
import { STARTER_PLANTS } from "../data/plants";
import type { Inquiry, InquiryRecord, InquiryStatus, Plant, PlantDraft } from "../types";
import { local, readJson, writeJson } from "./storage";

const DEMO_PLANTS = "garden.demoPlants";
const DEMO_INQUIRIES = "garden.demoInquiries";

export class ApiError extends Error {
  constructor(
    message: string,
    public code?: string,
  ) {
    super(message);
  }
}

async function parse(res: Response) {
  // Not an ApiError: callers show their own plain-language message for failures like this.
  if (!res.ok) throw new Error(`Apps Script answered ${res.status}`);
  const body = await res.json();
  if (body.status !== "success") throw new ApiError(body.message, body.code);
  return body;
}

// text/plain avoids a CORS preflight, which Apps Script can't answer.
const post = (body: object, init?: RequestInit) =>
  fetch(config.appsScriptUrl, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(body),
    ...init,
  }).then(parse);

const toPlant = (row: Record<string, unknown>) =>
  ({
    ...row,
    id: String(row.id),
    name: String(row.name),
    price: Number(row.price) || 0,
    stock: Number(row.stock) || 0,
    status: row.status === "Sold Out" ? "Sold Out" : "Available",
  }) as Plant;

const demoPlants = () => readJson<Plant[]>(local, DEMO_PLANTS) ?? STARTER_PLANTS.map((p, i) => ({ ...p, id: `PLT-${1001 + i}` }));
const demoInquiries = () => readJson<InquiryRecord[]>(local, DEMO_INQUIRIES) ?? [];

export async function fetchPlants(): Promise<Plant[]> {
  if (isDemo) return demoPlants();
  const body = await fetch(config.appsScriptUrl).then(parse);
  return (body.plants as Record<string, unknown>[]).filter((p) => p.id && p.name).map(toPlant);
}

export async function submitInquiry(inquiry: Inquiry): Promise<string> {
  if (isDemo) {
    const inquiryId = `INQ-${Date.now()}`;
    const record: InquiryRecord = { ...inquiry, inquiryId, timestamp: new Date().toISOString(), status: "Baru" };
    writeJson(local, DEMO_INQUIRIES, [...demoInquiries(), record]);
    return inquiryId;
  }
  // keepalive lets the log finish even if the page has already moved on to WhatsApp.
  const body = await post({ action: "SUBMIT_INQUIRY", ...inquiry }, { keepalive: true });
  return body.inquiryId;
}

export async function verifyPin(pin: string): Promise<void> {
  if (isDemo) {
    if (pin !== DEMO_PIN) throw new ApiError("Kod laluan salah.", "BAD_PIN");
    return;
  }
  await post({ action: "VERIFY_PIN", adminPin: pin });
}

export async function savePlant(pin: string, draft: PlantDraft): Promise<Plant> {
  if (isDemo) {
    const { imageBase64, ...fields } = draft;
    const saved: Plant = { ...fields, id: draft.id ?? `PLT-${Date.now()}`, imageUrl: imageBase64 ?? draft.imageUrl };
    const plants = demoPlants();
    const next = draft.id ? plants.map((p) => (p.id === saved.id ? saved : p)) : [...plants, saved];
    if (!writeJson(local, DEMO_PLANTS, next)) throw new ApiError("Storan pelayar penuh. Buang satu foto dan cuba lagi.");
    return saved;
  }
  const body = await post({ action: "SAVE_PLANT", adminPin: pin, plant: draft });
  const { imageBase64: _uploaded, ...fields } = draft;
  return { ...fields, id: body.plantId, imageUrl: body.imageUrl };
}

export async function deletePlant(pin: string, id: string): Promise<void> {
  if (isDemo) {
    writeJson(local, DEMO_PLANTS, demoPlants().filter((p) => p.id !== id));
    return;
  }
  await post({ action: "DELETE_PLANT", adminPin: pin, plantId: id });
}

export async function fetchInquiries(pin: string): Promise<InquiryRecord[]> {
  if (isDemo) return demoInquiries();
  return (await post({ action: "LIST_INQUIRIES", adminPin: pin })).inquiries;
}

export async function setInquiryStatus(pin: string, inquiryId: string, status: InquiryStatus): Promise<void> {
  if (isDemo) {
    writeJson(local, DEMO_INQUIRIES, demoInquiries().map((q) => (q.inquiryId === inquiryId ? { ...q, status } : q)));
    return;
  }
  await post({ action: "SET_INQUIRY_STATUS", adminPin: pin, inquiryId, status });
}
