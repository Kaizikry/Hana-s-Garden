import { useState, type FormEvent } from "react";
import { Choices, Field, Photo } from "../components/ui";
import { config } from "../config";
import { compressImage } from "../lib/image";
import { CATEGORIES, categoryLabel, type Plant, type PlantDraft, type PlantStatus } from "../types";

const STATUS_OPTIONS: { value: PlantStatus; label: string }[] = [
  { value: "Available", label: "In stock" },
  { value: "Sold Out", label: "Sold out" },
];

interface Props {
  plant: Plant | null;
  onSave: (draft: PlantDraft) => Promise<void>;
  onCancel: () => void;
  onError: (err: unknown) => string;
}

export function PlantForm({ plant, onSave, onCancel, onError }: Props) {
  const [form, setForm] = useState({
    name: plant?.name ?? "",
    altName: plant?.altName ?? "",
    category: plant?.category ?? "",
    price: plant ? String(plant.price) : "",
    stock: plant ? String(plant.stock) : "",
    sunlight: plant?.sunlight ?? "",
    water: plant?.water ?? "",
    potSize: plant?.potSize ?? "",
    description: plant?.description ?? "",
  });
  const [status, setStatus] = useState<PlantStatus>(plant?.status ?? "Available");
  const [photo, setPhoto] = useState<string>();
  const [photoError, setPhotoError] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saveError, setSaveError] = useState("");
  const [saving, setSaving] = useState(false);

  const input = (field: keyof typeof form) => ({
    value: form[field],
    onChange: (e: { target: { value: string } }) => setForm((f) => ({ ...f, [field]: e.target.value })),
  });

  const pickPhoto = async (file?: File) => {
    if (!file) return;
    setPhotoError("");
    try {
      setPhoto(await compressImage(file));
    } catch (err) {
      setPhotoError((err as Error).message);
    }
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const price = Number(form.price);
    const stock = Number(form.stock);
    const found = {
      ...(!form.name.trim() && { name: "Enter the plant's name." }),
      ...(!form.category && { category: "Choose a category." }),
      ...((form.price.trim() === "" || !(price >= 0)) && { price: "Enter a price, e.g. 25." }),
      ...((form.stock.trim() === "" || !Number.isInteger(stock) || stock < 0) && { stock: "Enter how many are in stock." }),
    };
    setErrors(found);
    if (Object.keys(found).length) return;

    setSaving(true);
    setSaveError("");
    try {
      await onSave({
        ...form,
        id: plant?.id,
        name: form.name.trim(),
        price,
        stock,
        status,
        imageUrl: plant?.imageUrl ?? "",
        ...(photo && { imageBase64: photo }),
      });
    } catch (err) {
      setSaveError(onError(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="plant-form" onSubmit={submit} noValidate>
      <header className="drawer-head">
        <h2>{plant ? "Edit plant" : "Add plant"}</h2>
        <button type="button" className="icon-btn" onClick={onCancel} aria-label="Close">×</button>
      </header>

      <label className="photo-pick">
        <div className="arch"><Photo plant={{ name: form.name, imageUrl: plant?.imageUrl ?? "" }} src={photo} /></div>
        <div>
          <strong>Upload a photo</strong>
          <p className="muted small">From your phone's gallery or camera. The photo is made smaller automatically before it uploads.</p>
          {photoError && <p className="low small" role="alert">{photoError}</p>}
        </div>
        <input type="file" accept="image/*" className="sr-only" onChange={(e) => pickPhoto(e.target.files?.[0])} />
      </label>

      <div className="field-row">
        <Field label="Plant name" error={errors.name}><input {...input("name")} /></Field>
        <Field label="Other name"><input {...input("altName")} /></Field>
      </div>
      <div className="field-row">
        <Field label="Category" error={errors.category}>
          <select {...input("category")}>
            <option value="" disabled>Choose a category</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{categoryLabel(c)}</option>)}
          </select>
        </Field>
        <div className="field-row">
          <Field label={`Price (${config.currency})`} error={errors.price}><input inputMode="decimal" {...input("price")} /></Field>
          <Field label="Stock" error={errors.stock}><input inputMode="numeric" {...input("stock")} /></Field>
        </div>
      </div>
      <div className="field-row">
        <Field label="Light"><input placeholder="e.g. Full sun" {...input("sunlight")} /></Field>
        <Field label="Water"><input placeholder="e.g. Once a week" {...input("water")} /></Field>
      </div>
      <div className="field-row">
        <Field label="Pot size"><input placeholder="e.g. 20cm pot" {...input("potSize")} /></Field>
        <Choices label="Status" name="status" options={STATUS_OPTIONS} value={status} onChange={setStatus} />
      </div>
      <Field label="Description"><textarea rows={3} {...input("description")} /></Field>

      {saveError && <p className="error-box" role="alert">{saveError}</p>}
      <div className="form-actions">
        <button type="button" className="btn btn-quiet" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn" disabled={saving}>{saving ? "Saving…" : "Save"}</button>
      </div>
    </form>
  );
}
