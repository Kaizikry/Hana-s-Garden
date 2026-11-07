import { config } from "../config";
import { readJson, session } from "../lib/storage";

export const SENT_KEY = "garden.sentInquiry";

interface Sent {
  name: string;
  inquiryId?: string;
  message: string;
  url: string | null;
}

/** Read from the tab's storage, because people come back here from WhatsApp, often after a reload. */
export function ThankYou() {
  const sent = readJson<Sent>(session, SENT_KEY);

  if (!sent) {
    return (
      <div className="page notice">
        <p>Tiada pertanyaan untuk ditunjukkan.</p>
        <a className="btn btn-quiet" href="#/">Kembali ke katalog</a>
      </div>
    );
  }

  return (
    <div className="page thanks">
      <h1>Terima kasih, {sent.name.split(" ")[0]}!</h1>
      {sent.url ? (
        <p className="page-lead">WhatsApp sepatutnya terbuka dengan mesej di bawah. Tekan Hantar di WhatsApp untuk sampaikan kepada {config.ownerName}.</p>
      ) : (
        <p className="page-lead">Nombor WhatsApp kedai belum ditetapkan, jadi mesej ini belum dihantar kepada {config.ownerName}.</p>
      )}
      {sent.inquiryId && <p className="muted small">Pertanyaan anda telah direkod. Rujukan: {sent.inquiryId}</p>}

      <div className="chat">
        <p className="chat-name">{config.shopName}</p>
        <p className="chat-bubble">{sent.message}</p>
      </div>

      <div className="thanks-actions">
        {sent.url && <a className="btn" href={sent.url}>Buka WhatsApp</a>}
        <a className="btn btn-quiet" href="#/">Kembali ke katalog</a>
      </div>
    </div>
  );
}
