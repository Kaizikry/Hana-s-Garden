import { useCallback, useEffect, useState } from "react";
import { config, DEMO_PIN, isDemo, PIN_LENGTH } from "../config";
import { ApiError, fetchInquiries, logout, verifyPin } from "../lib/api";
import { readJson, session, writeJson } from "../lib/storage";
import type { InquiryRecord } from "../types";
import { Inquiries } from "./Inquiries";
import { Inventory } from "./Inventory";

const TOKEN_KEY = "garden.adminSession";

export function Admin() {
  // Kept for this tab only, so picking a photo on a phone doesn't log you out if the tab reloads.
  const [token, setTokenState] = useState(() => readJson<string>(session, TOKEN_KEY));
  const setToken = useCallback((next: string | null) => {
    setTokenState(next);
    if (next) writeJson(session, TOKEN_KEY, next);
    else session?.removeItem(TOKEN_KEY);
  }, []);
  const signOut = useCallback(() => {
    if (token) logout(token).catch(() => {}); // The session expires by itself if this fails.
    setToken(null);
  }, [token, setToken]);
  return token ? <Dashboard token={token} onLogout={signOut} onExpired={() => setToken(null)} /> : <PinPad onUnlock={setToken} />;
}

function PinPad({ onUnlock }: { onUnlock: (token: string) => void }) {
  const [digits, setDigits] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const press = useCallback((key: string) => {
    setError("");
    setDigits((d) => (key === "del" ? d.slice(0, -1) : d.length < PIN_LENGTH ? d + key : d));
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (/^\d$/.test(e.key)) press(e.key);
      if (e.key === "Backspace") press("del");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [press]);

  useEffect(() => {
    if (digits.length !== PIN_LENGTH) return;
    setBusy(true);
    verifyPin(digits)
      .then(onUnlock)
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : "Couldn't connect. Check your internet connection and try again.");
        setDigits("");
      })
      .finally(() => setBusy(false));
  }, [digits, onUnlock]);

  return (
    <main className="pin">
      <h1>Admin</h1>
      <p className="muted">Enter the passcode to manage the inventory and inquiries.</p>
      <div className="pin-dots" role="img" aria-label={`${digits.length} of ${PIN_LENGTH} digits`}>
        {Array.from({ length: PIN_LENGTH }, (_, i) => <i key={i} className={i < digits.length ? "on" : ""} />)}
      </div>
      <p className="pin-message" role="alert">{busy ? "Checking…" : error}</p>
      <div className="pin-keys">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((n) => <button key={n} type="button" disabled={busy} onClick={() => press(n)}>{n}</button>)}
        <button type="button" disabled={busy} className="pin-zero" onClick={() => press("0")}>0</button>
        <button type="button" disabled={busy} className="pin-del" onClick={() => press("del")} aria-label="Delete one digit">⌫</button>
      </div>
      {isDemo && <p className="muted small">Demo passcode: {DEMO_PIN}</p>}
      <a className="back" href="#/">Back to the shop</a>
    </main>
  );
}

function Dashboard({ token, onLogout, onExpired }: { token: string; onLogout: () => void; onExpired: () => void }) {
  const [tab, setTab] = useState<"inventory" | "inquiries">("inventory");
  const [inquiries, setInquiries] = useState<InquiryRecord[] | null>(null);
  const [inquiriesFailed, setInquiriesFailed] = useState(false);

  const handleError = useCallback((err: unknown): string => {
    if (err instanceof ApiError && err.code === "BAD_SESSION") onExpired();
    return err instanceof ApiError ? err.message : "That didn't work. Check your internet connection and try again.";
  }, [onExpired]);

  const loadInquiries = useCallback(() => {
    setInquiriesFailed(false);
    fetchInquiries(token)
      .then(setInquiries)
      .catch((err) => {
        handleError(err);
        setInquiriesFailed(true);
      });
  }, [token, handleError]);
  useEffect(loadInquiries, [loadInquiries]);

  const newCount = inquiries?.filter((q) => q.status === "Baru").length ?? 0;

  return (
    <div className="admin">
      <header className="admin-bar">
        <a href="#/" className="admin-name">{config.shopName}</a>
        <nav className="admin-tabs">
          <button type="button" aria-pressed={tab === "inventory"} onClick={() => setTab("inventory")}>Inventory</button>
          <button type="button" aria-pressed={tab === "inquiries"} onClick={() => setTab("inquiries")}>
            Inquiries {newCount > 0 && <span className="count">{newCount}</span>}
          </button>
        </nav>
        <div className="admin-links">
          <a href="#/">View shop</a>
          <button type="button" onClick={onLogout}>Log out</button>
        </div>
      </header>
      {isDemo && <p className="demo-note">Demo mode: changes are only saved in this browser.</p>}
      {tab === "inventory"
        ? <Inventory token={token} onError={handleError} />
        : <Inquiries token={token} inquiries={inquiries} failed={inquiriesFailed} retry={loadInquiries} setInquiries={setInquiries} onError={handleError} />}
    </div>
  );
}
