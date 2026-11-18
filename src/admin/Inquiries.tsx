import { useState } from "react";
import { Photo } from "../components/ui";
import { setInquiryStatus } from "../lib/api";
import { inquiryTime, money, toWhatsAppNumber } from "../lib/format";
import { whatsappUrl } from "../lib/whatsapp";
import { useStore } from "../store";
import { STATUS_LABELS, type InquiryRecord, type InquiryStatus } from "../types";

const STATUSES: InquiryStatus[] = ["Baru", "Disahkan", "Selesai"];
const NEXT: Record<InquiryStatus, { label: string; status: InquiryStatus }> = {
  Baru: { label: "Mark confirmed", status: "Disahkan" },
  Disahkan: { label: "Mark done", status: "Selesai" },
  Selesai: { label: "Reopen", status: "Baru" },
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
  const [filter, setFilter] = useState<InquiryStatus | "All">("All");
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  // Matched by id, not name, so look-alike plants with similar names can't be mixed up.
  const { plants, status: plantsStatus } = useStore();
  const plantById = new Map(plants.map((p) => [p.id, p]));

  const newestFirst = [...(inquiries ?? [])].sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  const shown = newestFirst.filter((q) => filter === "All" || q.status === filter);
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
      <h1>Inquiries</h1>
      <p className="muted">Every inquiry from the checkout form is saved here, with the pickup time the customer chose.</p>

      <div className="tabs" role="group" aria-label="Inquiry status">
        <button type="button" aria-pressed={filter === "All"} onClick={() => setFilter("All")}>All {newestFirst.length}</button>
        {STATUSES.map((s) => (
          <button key={s} type="button" aria-pressed={filter === s} onClick={() => setFilter(s)}>{STATUS_LABELS[s]} {countOf(s)}</button>
        ))}
      </div>

      {error && <p className="error-box" role="alert">{error}</p>}
      {failed && (
        <div className="notice" role="alert">
          <p>The inquiries couldn't be loaded.</p>
          <button type="button" className="btn" onClick={retry}>Try again</button>
        </div>
      )}
      {!failed && !inquiries && <p className="notice" role="status">Loading the inquiries…</p>}
      {inquiries && shown.length === 0 && (
        <p className="notice">
          {filter === "All" ? "No inquiries yet. Customers' inquiries will show up here as soon as they send the checkout form." : `No inquiries marked ${STATUS_LABELS[filter]}.`}
        </p>
      )}

      <ul className="inquiries">
        {shown.map((q) => (
          <li key={q.inquiryId} className="inquiry">
            <header>
              <h3>{q.customerName}</h3>
              <span className={`status status-${q.status}`}>{STATUS_LABELS[q.status]}</span>
              <time className="muted small">{inquiryTime(q.timestamp)}</time>
            </header>
            <p className="muted small">{q.customerPhone} · {q.inquiryId}</p>
            <p><strong>{q.pickupPreference}</strong></p>
            <ul className="inquiry-items">
              {q.items.map((item) => {
                const plant = plantById.get(item.id);
                return (
                  <li key={item.id}>
                    {plant ? (
                      <a className="item-thumb" href={`#/plant/${encodeURIComponent(plant.id)}`} target="_blank" rel="noreferrer" aria-label={`See the photo of ${plant.name}`}>
                        <Photo plant={plant} />
                      </a>
                    ) : (
                      <span className="item-thumb">{plantsStatus === "ready" && <span className="photo-empty">Deleted</span>}</span>
                    )}
                    <span><strong>{item.name}</strong> × {item.qty}</span>
                  </li>
                );
              })}
            </ul>
            {q.notes && <blockquote>{q.notes}</blockquote>}
            <p className="total"><span>Estimated total</span> <strong>{money(q.totalPrice)}</strong></p>
            <div className="form-actions">
              <button type="button" className="btn btn-quiet btn-small" disabled={busyId === q.inquiryId} onClick={() => advance(q)}>{NEXT[q.status].label}</button>
              <a className="btn btn-small" href={whatsappUrl(toWhatsAppNumber(q.customerPhone), `Hi ${q.customerName}, `)} target="_blank" rel="noreferrer">Reply</a>
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
