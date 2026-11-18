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
const TIME_OPTIONS = config.pickupWindows.map((value) => ({ value, label: <b>{value}</b> }));

function validate(form: typeof EMPTY) {
  return {
    ...(!form.name.trim() && { name: "Please enter your name." }),
    ...(!isValidPhone(form.phone) && { phone: "Please enter a valid phone number, e.g. 012-345 6789." }),
    ...(!form.day && { day: "Please choose a pickup day." }),
    ...(!form.time && { time: "Please choose a pickup time." }),
  };
}

export function Checkout() {
  const { items, count, total, whatsappNumber, clearBasket, setBasketOpen } = useStore();
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState<Partial<typeof EMPTY>>({});
  const [sending, setSending] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  // Worked out on each render, because a tab left open overnight would otherwise keep yesterday's dates.
  const dayOptions = pickupDays().map((d) => ({ value: d.value, label: <><b>{d.label}</b><small>{d.date}</small></> }));

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
    window.location.hash = "/thank-you";
    // Same-tab navigation, because popup blockers stop new tabs opened after an await.
    if (url) window.location.assign(url);
  };

  if (items.length === 0) {
    return (
      <div className="page notice">
        <p>Your basket is empty.</p>
        <a className="btn btn-quiet" href="#/">See the catalog</a>
      </div>
    );
  }

  return (
    <div className="page">
      <button type="button" className="back" onClick={() => setBasketOpen(true)}>← Basket</button>
      <h1>Your details</h1>
      <p className="page-lead">Fill in the details below. Your inquiry is saved, then WhatsApp opens with the plants you picked.</p>

      <form className="checkout" onSubmit={submit} noValidate ref={formRef}>
        <div className="checkout-fields">
          <div className="field-row">
            <Field label="Name" error={errors.name}>
              <input name="name" autoComplete="name" placeholder="e.g. Nurul Aisyah" value={form.name} onChange={(e) => update("name")(e.target.value)} />
            </Field>
            <Field label="Phone number" error={errors.phone}>
              <input name="phone" type="tel" autoComplete="tel" placeholder="012-345 6789" value={form.phone} onChange={(e) => update("phone")(e.target.value)} />
            </Field>
          </div>
          <Choices label="Pickup day" name="day" options={dayOptions} value={form.day} error={errors.day} onChange={update("day")} />
          <Choices label="Pickup time" name="time" options={TIME_OPTIONS} value={form.time} error={errors.time} onChange={update("time")} />
          <Field label="Notes or questions (optional)">
            <textarea name="notes" rows={3} placeholder="e.g. Could you pick ones with fuller leaves?" value={form.notes} onChange={(e) => update("notes")(e.target.value)} />
          </Field>
        </div>

        <aside className="summary">
          <h2>Your basket <small>{count} {count === 1 ? "plant" : "plants"}</small></h2>
          <ul>
            {items.map((item) => <li key={item.id}><span>{item.name} × {item.qty}</span> <strong>{money(item.price * item.qty)}</strong></li>)}
          </ul>
          <p className="total"><span>Estimated total</span> <strong>{money(total)}</strong></p>
          <p className="small">Self pickup at {config.pickupPlace}{form.day && `, ${form.day}`}{form.time && ` · ${form.time}`}</p>
          <button type="submit" className="btn btn-wide" disabled={sending}>
            {sending ? "Saving…" : "Send inquiry on WhatsApp"}
          </button>
          <p className="muted small">Prices are estimates. {config.ownerName} will confirm stock and the final price on WhatsApp.</p>
          <p className="muted small">Your name and phone number are saved and only used by {config.ownerName} to handle this inquiry. To check or delete your details, contact {config.ownerName} on WhatsApp.</p>
        </aside>
      </form>
    </div>
  );
}
