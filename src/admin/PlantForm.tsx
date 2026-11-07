import { useState, type FormEvent } from "react";
import { Choices, Field, Photo } from "../components/ui";
import { config } from "../config";
import { compressImage } from "../lib/image";
import { CATEGORIES, type Plant, type PlantDraft, type PlantStatus } from "../types";

const STATUS_OPTIONS: { value: PlantStatus; label: string }[] = [
  { value: "Available", label: "Ada stok" },
  { value: "Sold Out", label: "Habis dijual" },
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
      ...(!form.name.trim() && { name: "Isi nama pokok." }),
      ...(!form.category && { category: "Pilih kategori." }),
      ...((form.price.trim() === "" || !(price >= 0)) && { price: "Isi harga, cth. 25." }),
      ...((form.stock.trim() === "" || !Number.isInteger(stock) || stock < 0) && { stock: "Isi jumlah stok." }),
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
        <h2>{plant ? "Edit pokok" : "Tambah pokok"}</h2>
        <button type="button" className="icon-btn" onClick={onCancel} aria-label="Tutup">×</button>
      </header>

      <label className="photo-pick">
        <div className="arch"><Photo plant={{ name: form.name, imageUrl: plant?.imageUrl ?? "" }} src={photo} /></div>
        <div>
          <strong>Muat naik foto</strong>
          <p className="muted small">Dari galeri atau kamera telefon. Foto dikecilkan secara automatik sebelum dimuat naik.</p>
          {photoError && <p className="low small" role="alert">{photoError}</p>}
        </div>
        <input type="file" accept="image/*" className="sr-only" onChange={(e) => pickPhoto(e.target.files?.[0])} />
      </label>

      <div className="field-row">
        <Field label="Nama pokok" error={errors.name}><input {...input("name")} /></Field>
        <Field label="Nama lain"><input {...input("altName")} /></Field>
      </div>
      <div className="field-row">
        <Field label="Kategori" error={errors.category}>
          <select {...input("category")}>
            <option value="" disabled>Pilih kategori</option>
            {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </Field>
        <div className="field-row">
          <Field label={`Harga (${config.currency})`} error={errors.price}><input inputMode="decimal" {...input("price")} /></Field>
          <Field label="Stok" error={errors.stock}><input inputMode="numeric" {...input("stock")} /></Field>
        </div>
      </div>
      <div className="field-row">
        <Field label="Cahaya"><input placeholder="cth. Matahari penuh" {...input("sunlight")} /></Field>
        <Field label="Siraman"><input placeholder="cth. 1x seminggu" {...input("water")} /></Field>
      </div>
      <div className="field-row">
        <Field label="Saiz pasu"><input placeholder="cth. Pasu 20cm" {...input("potSize")} /></Field>
        <Choices label="Status" name="status" options={STATUS_OPTIONS} value={status} onChange={setStatus} />
      </div>
      <Field label="Penerangan"><textarea rows={3} {...input("description")} /></Field>

      {saveError && <p className="error-box" role="alert">{saveError}</p>}
      <div className="form-actions">
        <button type="button" className="btn btn-quiet" onClick={onCancel}>Batal</button>
        <button type="submit" className="btn" disabled={saving}>{saving ? "Sedang menyimpan…" : "Simpan"}</button>
      </div>
    </form>
  );
}
