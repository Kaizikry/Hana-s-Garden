import { useState } from "react";
import { Photo, SoldBadge, Stepper, stockText } from "../components/ui";
import { config } from "../config";
import { money } from "../lib/format";
import { readJson, session } from "../lib/storage";
import { useStore } from "../store";
import { inStock } from "../types";
import { CATALOG_ROUTE } from "./Catalog";

/** Back to the catalog page the customer came from. Only a plain page number is trusted from storage. */
function catalogHref() {
  const route = readJson<string>(session, CATALOG_ROUTE);
  return typeof route === "string" && /^\/(\?halaman=\d{1,4})?$/.test(route) ? `#${route}` : "#/";
}

export function PlantPage({ id }: { id: string }) {
  const { plants, status, qtyOf, setQty, setBasketOpen } = useStore();
  const [qty, setLocalQty] = useState(1);
  const plant = plants.find((p) => p.id === id);
  const back = catalogHref();

  if (!plant) {
    return (
      <div className="page notice">
        <p>{status === "loading" ? "Sedang memuatkan pokok, sekejap ya." : "Pokok ini tidak dijumpai."}</p>
        <a className="back" href={back}>← Katalog</a>
      </div>
    );
  }

  const care = [["Cahaya", plant.sunlight], ["Siraman", plant.water], ["Saiz pasu", plant.potSize]].filter(([, value]) => value);
  const addToBasket = () => {
    setQty(plant, qtyOf(plant.id) + qty);
    setBasketOpen(true);
  };

  return (
    <div className="page">
      <a className="back" href={back}>← Katalog</a>
      <div className="plant-page">
        <div className="arch">
          <Photo plant={plant} />
          {!inStock(plant) && <SoldBadge />}
        </div>
        <div>
          <p className="muted">{plant.category} · <span className={plant.stock > 3 && inStock(plant) ? "" : "low"}>{stockText(plant)}</span></p>
          <h1>{plant.name}</h1>
          {plant.altName && <p className="muted">{plant.altName}</p>}
          <p className="plant-price"><strong>{money(plant.price)}</strong> anggaran sepokok</p>
          {plant.description && <p>{plant.description}</p>}
          <dl className="care">
            {care.map(([term, value]) => <div key={term}><dt>{term}</dt><dd>{value}</dd></div>)}
          </dl>
          {inStock(plant) && (
            <div className="add-row">
              <Stepper value={qty} max={plant.stock} label={plant.name} onChange={(n) => setLocalQty(Math.max(1, n))} />
              <button type="button" className="btn" onClick={addToBasket}>Tambah ke bakul · {money(plant.price * qty)}</button>
            </div>
          )}
          <p className="muted small">Ini pertanyaan tempahan. {config.ownerName} akan sahkan stok dan harga melalui WhatsApp sebelum anda datang ambil.</p>
        </div>
      </div>
    </div>
  );
}
