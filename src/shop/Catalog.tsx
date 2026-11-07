import { useMemo, useState } from "react";
import { Photo, stockText } from "../components/ui";
import { config } from "../config";
import { money } from "../lib/format";
import { useStore } from "../store";
import { CATEGORIES, inStock, type Plant } from "../types";

const HERO_PHOTOS = ["images/bromelia-02.jpeg", "images/bromelia-14.jpeg", "images/bromelia-09.jpeg"];

export function Catalog() {
  const { plants, status, reload } = useStore();
  const [category, setCategory] = useState("Semua");
  const [query, setQuery] = useState("");

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return plants.filter(
      (p) => (category === "Semua" || p.category === category) && (!q || `${p.name} ${p.altName}`.toLowerCase().includes(q)),
    );
  }, [plants, category, query]);

  const usedCategories = CATEGORIES.filter((c) => plants.some((p) => p.category === c));

  return (
    <>
      <section className="hero">
        <div className="hero-text">
          <h1>Pokok dari laman kami, sedia untuk laman anda.</h1>
          <p>Pilih pokok, masukkan ke bakul, dan hantar satu pertanyaan terus ke WhatsApp {config.ownerName}.</p>
        </div>
        <div className="hero-arches" aria-hidden="true">
          {HERO_PHOTOS.map((src) => <img key={src} src={src} alt="" />)}
        </div>
      </section>

      <p className="pickup-band">
        <strong>Ambil sendiri di {config.pickupArea}</strong>
        <span>{config.pickupHours}</span>
      </p>

      <section className="catalog" aria-label="Katalog pokok">
        <div className="catalog-head">
          <div>
            <h2>Katalog pokok</h2>
            <p>Semua harga ialah anggaran. {config.ownerName} akan sahkan stok dan harga melalui WhatsApp.</p>
          </div>
          <input type="search" aria-label="Cari nama pokok" placeholder="Cari nama pokok…" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>

        {usedCategories.length > 1 && (
          <div className="tabs" role="group" aria-label="Kategori">
            {["Semua", ...usedCategories].map((name) => (
              <button key={name} type="button" aria-pressed={category === name} onClick={() => setCategory(name)}>{name}</button>
            ))}
          </div>
        )}

        {status === "loading" && plants.length === 0 && <p className="notice" role="status">Sedang memuatkan pokok, sekejap ya.</p>}

        {status === "error" && (
          <div className="notice" role="alert">
            <p>Senarai pokok tidak dapat dimuatkan. Semak sambungan internet anda dan cuba lagi.</p>
            <button type="button" className="btn" onClick={reload}>Cuba lagi</button>
          </div>
        )}

        {status === "ready" && plants.length === 0 && <p className="notice">Belum ada pokok disenaraikan. Sila datang semula nanti.</p>}

        {plants.length > 0 && shown.length === 0 && (
          <div className="notice">
            <p>Tiada pokok dengan nama itu.</p>
            <button type="button" className="btn btn-quiet" onClick={() => { setQuery(""); setCategory("Semua"); }}>Lihat semua pokok</button>
          </div>
        )}

        <ul className="plant-grid">
          {shown.map((plant) => <li key={plant.id}><PlantCard plant={plant} /></li>)}
        </ul>
      </section>
    </>
  );
}

function PlantCard({ plant }: { plant: Plant }) {
  const { qtyOf, setQty, setBasketOpen } = useStore();
  const href = `#/pokok/${encodeURIComponent(plant.id)}`;
  const available = inStock(plant);
  const inBasket = qtyOf(plant.id);

  return (
    <article className={available ? "plant-card" : "plant-card is-sold"}>
      <a className="arch" href={href} tabIndex={-1} aria-hidden="true"><Photo plant={plant} /></a>
      <div className="plant-card-title">
        <h3><a href={href}>{plant.name}</a></h3>
        <strong>{money(plant.price)}</strong>
      </div>
      {plant.altName && <p className="muted">{plant.altName}</p>}
      <div className="plant-card-foot">
        <span className={available && plant.stock > 3 ? "muted" : "low"}>{stockText(plant)}</span>
        {available && (inBasket > 0
          ? <button type="button" className="btn btn-quiet btn-small" onClick={() => setBasketOpen(true)}>Dalam bakul · {inBasket}</button>
          : <button type="button" className="btn btn-small" onClick={() => setQty(plant, 1)} aria-label={`Tambah ${plant.name}`}>Tambah</button>)}
      </div>
    </article>
  );
}
