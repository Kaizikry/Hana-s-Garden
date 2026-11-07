import { useRef, useState, type FormEvent } from "react";
import { Choices, Field } from "../components/ui";
import { config } from "../config";
import { submitInquiry } from "../lib/api";
import { isValidPhone, money, pickupDays, toWhatsAppNumber } from "../lib/format";
import { session, writeJson } from "../lib/storage";
import { buildMessage, whatsappUrl } from "../lib/whatsapp";
import { useStore } from "../store";
import type { Inquiry } from "../types";
import { SENT_KEY } from "./ThankYou";

const LOG_TIMEOUT_MS = 4000;
const EMPTY = { name: "", phone: "", day: "", time: "", notes: "" };
const DAY_OPTIONS = pickupDays().map((d) => ({ value: d.value, label: <><b>{d.label}</b><small>{d.date}</small></> }));
const TIME_OPTIONS = config.pickupWindows.map((value) => ({ value, label: <b>{value}</b> }));

function validate(form: typeof EMPTY) {
  return {
    ...(!form.name.trim() && { name: "Sila isi nama anda." }),
    ...(!isValidPhone(form.phone) && { phone: "Sila isi nombor telefon yang betul, cth. 012-345 6789." }),
    ...(!form.day && { day: "Sila pilih hari ambil." }),
    ...(!form.time && { time: "Sila pilih masa ambil." }),
  };
}

export function Checkout() {
  const { items, count, total, whatsappNumber, clearBasket, setBasketOpen } = useStore();
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState<Partial<typeof EMPTY>>({});
  const [sending, setSending] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const update = (field: keyof typeof EMPTY) => (value: string) => {
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((e) => ({ ...e, [field]: undefined }));
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const found = validate(form);
    setErrors(found);
    const firstError = Object.keys(found)[0];
    if (firstError) {
      formRef.current?.querySelector<HTMLElement>(`[name="${firstError}"]`)?.focus();
      return;
    }

    const inquiry: Inquiry = {
      customerName: form.name.trim(),
      customerPhone: form.phone.trim(),
      pickupPreference: `${form.day} · ${form.time}`,
      items,
      totalPrice: total,
      notes: form.notes.trim(),
    };

    setSending(true);
    // The log must never stop the customer reaching WhatsApp, so it only gets a short head start.
    const inquiryId = await Promise.race([
      submitInquiry(inquiry).catch((err) => {
        console.warn("Inquiry was not logged:", err);
        return undefined;
      }),
      new Promise<undefined>((resolve) => setTimeout(resolve, LOG_TIMEOUT_MS)),
    ]);

    const message = buildMessage(config.shopName, inquiry, inquiryId);
    const url = whatsappNumber ? whatsappUrl(toWhatsAppNumber(whatsappNumber), message) : null;
    writeJson(session, SENT_KEY, { name: inquiry.customerName, inquiryId, message, url });
    clearBasket();
    window.location.hash = "/terima-kasih";
    // Same-tab navigation, because popup blockers stop new tabs opened after an await.
    if (url) window.location.assign(url);
  };

  if (items.length === 0) {
    return (
      <div className="page notice">
        <p>Bakul anda masih kosong.</p>
        <a className="btn btn-quiet" href="#/">Lihat katalog</a>
      </div>
    );
  }

  return (
    <div className="page">
      <button type="button" className="back" onClick={() => setBasketOpen(true)}>← Bakul</button>
      <h1>Butiran tempahan</h1>
      <p className="page-lead">Isi maklumat di bawah. Pertanyaan anda akan direkod, kemudian WhatsApp dibuka dengan senarai pokok yang dipilih.</p>

      <form className="checkout" onSubmit={submit} noValidate ref={formRef}>
        <div className="checkout-fields">
          <div className="field-row">
            <Field label="Nama" error={errors.name}>
              <input name="name" autoComplete="name" placeholder="cth. Nurul Aisyah" value={form.name} onChange={(e) => update("name")(e.target.value)} />
            </Field>
            <Field label="No. telefon" error={errors.phone}>
              <input name="phone" type="tel" autoComplete="tel" placeholder="012-345 6789" value={form.phone} onChange={(e) => update("phone")(e.target.value)} />
            </Field>
          </div>
          <Choices label="Hari ambil" name="day" options={DAY_OPTIONS} value={form.day} error={errors.day} onChange={update("day")} />
          <Choices label="Masa ambil" name="time" options={TIME_OPTIONS} value={form.time} error={errors.time} onChange={update("time")} />
          <Field label="Nota atau soalan (pilihan)">
            <textarea name="notes" rows={3} placeholder="cth. Boleh pilihkan yang daun lebih lebat?" value={form.notes} onChange={(e) => update("notes")(e.target.value)} />
          </Field>
        </div>

        <aside className="summary">
          <h2>Bakul anda <small>{count} pokok</small></h2>
          <ul>
            {items.map((item) => <li key={item.id}><span>{item.name} × {item.qty}</span> <strong>{money(item.price * item.qty)}</strong></li>)}
          </ul>
          <p className="total"><span>Jumlah anggaran</span> <strong>{money(total)}</strong></p>
          <p className="small">Ambil sendiri di {config.pickupPlace}{form.day && `, ${form.day}`}{form.time && ` · ${form.time}`}</p>
          <button type="submit" className="btn btn-wide" disabled={sending}>
            {sending ? "Sedang merekod…" : "Hantar Pertanyaan via WhatsApp"}
          </button>
          <p className="muted small">Harga anggaran. {config.ownerName} akan sahkan stok dan harga akhir melalui WhatsApp.</p>
        </aside>
      </form>
    </div>
  );
}
