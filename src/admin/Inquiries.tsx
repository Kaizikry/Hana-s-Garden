import { useState } from "react";
import { setInquiryStatus } from "../lib/api";
import { inquiryTime, money, toWhatsAppNumber } from "../lib/format";
import { whatsappUrl } from "../lib/whatsapp";
import type { InquiryRecord, InquiryStatus } from "../types";

const STATUSES: InquiryStatus[] = ["Baru", "Disahkan", "Selesai"];
const NEXT: Record<InquiryStatus, { label: string; status: InquiryStatus }> = {
  Baru: { label: "Tandakan disahkan", status: "Disahkan" },
  Disahkan: { label: "Tandakan selesai", status: "Selesai" },
  Selesai: { label: "Buka semula", status: "Baru" },
};

interface Props {
  token: string;
  inquiries: InquiryRecord[] | null;
  failed: boolean;
  retry: () => void;
  setInquiries: (update: (list: InquiryRecord[] | null) => InquiryRecord[] | null) => void;
  onError: (err: unknown) => string;
}

export function Inquiries({ token, inquiries, failed, retry, setInquiries, onError }: Props) {
  const [filter, setFilter] = useState<InquiryStatus | "Semua">("Semua");
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");

  const newestFirst = [...(inquiries ?? [])].sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  const shown = newestFirst.filter((q) => filter === "Semua" || q.status === filter);
  const countOf = (status: InquiryStatus) => newestFirst.filter((q) => q.status === status).length;

  const advance = async (q: InquiryRecord) => {
    const { status } = NEXT[q.status];
    setBusyId(q.inquiryId);
    setError("");
    try {
      await setInquiryStatus(token, q.inquiryId, status);
      setInquiries((list) => list?.map((x) => (x.inquiryId === q.inquiryId ? { ...x, status } : x)) ?? null);
    } catch (err) {
      setError(onError(err));
    } finally {
      setBusyId("");
    }
  };

  return (
    <main className="admin-page">
      <h1>Pertanyaan</h1>
      <p className="muted">Setiap pertanyaan dari borang tempahan direkod di sini, termasuk masa ambil yang dipilih.</p>

      <div className="tabs" role="group" aria-label="Status pertanyaan">
        <button type="button" aria-pressed={filter === "Semua"} onClick={() => setFilter("Semua")}>Semua {newestFirst.length}</button>
        {STATUSES.map((s) => (
          <button key={s} type="button" aria-pressed={filter === s} onClick={() => setFilter(s)}>{s} {countOf(s)}</button>
        ))}
      </div>

      {error && <p className="error-box" role="alert">{error}</p>}
      {failed && (
        <div className="notice" role="alert">
          <p>Pertanyaan tidak dapat dimuatkan.</p>
          <button type="button" className="btn" onClick={retry}>Cuba lagi</button>
        </div>
      )}
      {!failed && !inquiries && <p className="notice" role="status">Sedang memuatkan pertanyaan…</p>}
      {inquiries && shown.length === 0 && (
        <p className="notice">
          {filter === "Semua" ? "Belum ada pertanyaan. Pertanyaan pelanggan akan muncul di sini sebaik sahaja mereka menghantar borang tempahan." : `Tiada pertanyaan berstatus ${filter}.`}
        </p>
      )}

      <ul className="inquiries">
        {shown.map((q) => (
          <li key={q.inquiryId} className="inquiry">
            <header>
              <h3>{q.customerName}</h3>
              <span className={`status status-${q.status}`}>{q.status}</span>
              <time className="muted small">{inquiryTime(q.timestamp)}</time>
            </header>
            <p className="muted small">{q.customerPhone} · {q.inquiryId}</p>
            <p><strong>{q.pickupPreference}</strong></p>
            <ul className="inquiry-items">
              {q.items.map((item) => <li key={item.id}>{item.name} × {item.qty}</li>)}
            </ul>
            {q.notes && <blockquote>{q.notes}</blockquote>}
            <p className="total"><span>Jumlah anggaran</span> <strong>{money(q.totalPrice)}</strong></p>
            <div className="form-actions">
              <button type="button" className="btn btn-quiet btn-small" disabled={busyId === q.inquiryId} onClick={() => advance(q)}>{NEXT[q.status].label}</button>
              <a className="btn btn-small" href={whatsappUrl(toWhatsAppNumber(q.customerPhone), `Salam ${q.customerName}, `)} target="_blank" rel="noreferrer">Balas</a>
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
