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
        <p>There's no inquiry to show.</p>
        <a className="btn btn-quiet" href="#/">Back to the catalog</a>
      </div>
    );
  }

  return (
    <div className="page thanks">
      <h1>Thank you, {sent.name.split(" ")[0]}!</h1>
      {sent.url ? (
        <p className="page-lead">WhatsApp should open with the message below. Press Send in WhatsApp to pass it to {config.ownerName}.</p>
      ) : (
        <p className="page-lead">The shop's WhatsApp number isn't set up yet, so this message hasn't reached {config.ownerName}.</p>
      )}
      {sent.inquiryId && <p className="muted small">Your inquiry has been saved. Reference: {sent.inquiryId}</p>}

      <div className="chat">
        <p className="chat-name">{config.shopName}</p>
        <p className="chat-bubble">{sent.message}</p>
      </div>

      <div className="thanks-actions">
        {sent.url && <a className="btn" href={sent.url}>Open WhatsApp</a>}
        <a className="btn btn-quiet" href="#/">Back to the catalog</a>
      </div>
    </div>
  );
}
