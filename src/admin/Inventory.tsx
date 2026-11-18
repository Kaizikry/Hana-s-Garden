import { useState } from "react";
import { Dialog } from "../components/Dialog";
import { Pager } from "../components/Pager";
import { Photo } from "../components/ui";
import { isDemo } from "../config";
import { STARTER_PLANTS } from "../data/plants";
import { deletePlant, savePlant } from "../lib/api";
import { money } from "../lib/format";
import { paginate } from "../lib/pages";
import { useStore } from "../store";
import { categoryLabel, inStock, type Plant, type PlantDraft } from "../types";
import { PlantForm } from "./PlantForm";

const PER_PAGE = 20;

export function Inventory({ token, onError }: { token: string; onError: (err: unknown) => string }) {
  const { plants, setPlants, status, reload } = useStore();
  const [editing, setEditing] = useState<Plant | "new" | null>(null);
  const [deleting, setDeleting] = useState<Plant | null>(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [askedPage, setAskedPage] = useState(1);

  // Newest first, and stock doesn't affect the order, so a plant stays put when it's switched.
  const q = query.trim().toLowerCase();
  const matching = [...plants].reverse().filter((p) => !q || `${p.name} ${p.altName}`.toLowerCase().includes(q));
  const { items, page, pages } = paginate(matching, askedPage, PER_PAGE);
  const goTo = (n: number) => {
    setAskedPage(n);
    window.scrollTo(0, 0);
  };

  const upsert = (saved: Plant) =>
    setPlants((list) => (list.some((p) => p.id === saved.id) ? list.map((p) => (p.id === saved.id ? saved : p)) : [...list, saved]));

  const run = async (key: string, action: () => Promise<void>) => {
    setBusy(key);
    setError("");
    try {
      await action();
    } catch (err) {
      setError(onError(err));
    } finally {
      setBusy("");
    }
  };

  const toggle = (plant: Plant) => {
    // Switching on with nothing in stock can't work, so ask for the new count instead.
    if (!inStock(plant) && plant.stock <= 0) return setEditing(plant);
    const next: Plant = { ...plant, status: plant.status === "Sold Out" ? "Available" : "Sold Out" };
    return run(plant.id, async () => upsert(await savePlant(token, next)));
  };

  const save = async (draft: PlantDraft) => {
    upsert(await savePlant(token, draft));
    // A new plant goes to the top of page 1, so show it there.
    if (editing === "new") {
      setQuery("");
      setAskedPage(1);
    }
    setEditing(null);
  };

  const remove = () =>
    run("delete", async () => {
      await deletePlant(token, deleting!.id);
      setPlants((list) => list.filter((p) => p.id !== deleting!.id));
      setDeleting(null);
    });

  const addStarters = () =>
    run("starters", async () => {
      for (const starter of STARTER_PLANTS) upsert(await savePlant(token, starter));
    });

  const available = plants.filter(inStock).length;

  return (
    <main className="admin-page">
      <div className="admin-head">
        <div>
          <h1>Inventory</h1>
          <p className="muted">{plants.length} plants · {available} in stock · {plants.length - available} sold out</p>
        </div>
        <button type="button" className="btn" onClick={() => setEditing("new")}>Add plant</button>
      </div>
      {plants.length > 0 && (
        <input
          type="search"
          className="admin-search"
          aria-label="Search plant names"
          placeholder="Search plant names…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setAskedPage(1);
          }}
        />
      )}

      {error && <p className="error-box" role="alert">{error}</p>}
      {status === "loading" && plants.length === 0 && <p className="notice" role="status">Loading the plants…</p>}
      {status === "error" && (
        <div className="notice" role="alert">
          <p>The plant list couldn't be loaded.</p>
          <button type="button" className="btn" onClick={reload}>Try again</button>
        </div>
      )}
      {status === "ready" && plants.length === 0 && (
        <div className="notice">
          <p>No plants yet. Add the first plant, or add the {STARTER_PLANTS.length} plants from the existing photos.</p>
          {!isDemo && (
            <button type="button" className="btn btn-quiet" disabled={!!busy} onClick={addStarters}>
              {busy === "starters" ? "Adding…" : `Add ${STARTER_PLANTS.length} plants`}
            </button>
          )}
        </div>
      )}

      {q && matching.length === 0 && <p className="notice">No plants match that name.</p>}

      <ul className="stock-list">
        {items.map((plant) => (
          <li key={plant.id} className="stock-row">
            <div className="stock-thumb"><Photo plant={plant} /></div>
            <div className="stock-name">
              <h3>{plant.name}</h3>
              <p className="muted small">{categoryLabel(plant.category)} · {plant.id}</p>
            </div>
            <p className="stock-num"><small>Price</small>{money(plant.price)}</p>
            <p className="stock-num"><small>Stock</small>{plant.stock}</p>
            <button
              type="button"
              role="switch"
              aria-checked={inStock(plant)}
              aria-label={`${plant.name} in stock`}
              className="switch"
              disabled={busy === plant.id}
              onClick={() => toggle(plant)}
            >
              <i /> {inStock(plant) ? "In stock" : "Sold out"}
            </button>
            <div className="stock-actions">
              <button type="button" className="link-btn" onClick={() => setEditing(plant)} aria-label={`Edit ${plant.name}`}>Edit</button>
              <button type="button" className="link-btn" onClick={() => setDeleting(plant)} aria-label={`Delete ${plant.name}`}>Delete</button>
            </div>
          </li>
        ))}
      </ul>
      <Pager page={page} pages={pages} onPick={goTo} />

      <Dialog open={editing !== null} onClose={() => setEditing(null)} label={editing === "new" ? "Add plant" : "Edit plant"}>
        {editing !== null && <PlantForm plant={editing === "new" ? null : editing} onCancel={() => setEditing(null)} onSave={save} onError={onError} />}
      </Dialog>

      <Dialog open={deleting !== null} onClose={() => setDeleting(null)} label="Delete plant">
        {deleting && (
          <div className="confirm">
            <h2>Delete {deleting.name}?</h2>
            <p>This plant will disappear from the shop and from the Google Sheet. If it might be back in stock later, mark it sold out instead.</p>
            <div className="form-actions">
              <button type="button" className="btn btn-quiet" onClick={() => setDeleting(null)}>Cancel</button>
              <button type="button" className="btn" disabled={busy === "delete"} onClick={remove}>{busy === "delete" ? "Deleting…" : "Delete plant"}</button>
            </div>
          </div>
        )}
      </Dialog>
    </main>
  );
}
