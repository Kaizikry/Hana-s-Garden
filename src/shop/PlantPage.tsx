import { useState } from "react";
import { Photo, SoldBadge, Stepper, stockText } from "../components/ui";
import { config } from "../config";
import { money } from "../lib/format";
import { readJson, session } from "../lib/storage";
import { useStore } from "../store";
import { categoryLabel, inStock } from "../types";
import { CATALOG_ROUTE } from "./Catalog";

/** Back to the catalog page the customer came from. Only a plain page number is trusted from storage. */
function catalogHref() {
  const route = readJson<string>(session, CATALOG_ROUTE);
  return typeof route === "string" && /^\/(\?page=\d{1,4})?$/.test(route) ? `#${route}` : "#/";
}

export function PlantPage({ id }: { id: string }) {
  const { plants, status, qtyOf, setQty, setBasketOpen } = useStore();
  const [qty, setLocalQty] = useState(1);
  const plant = plants.find((p) => p.id === id);
  const back = catalogHref();

  if (!plant) {
    return (
      <div className="page notice">
        <p>{status === "loading" ? "Loading the plants, one moment." : "This plant couldn't be found."}</p>
        <a className="back" href={back}>← Catalog</a>
      </div>
    );
  }

  const care = [["Light", plant.sunlight], ["Water", plant.water], ["Pot size", plant.potSize]].filter(([, value]) => value);
  const addToBasket = () => {
    setQty(plant, qtyOf(plant.id) + qty);
    setBasketOpen(true);
  };

  return (
    <div className="page">
      <a className="back" href={back}>← Catalog</a>
      <div className="plant-page">
        <div className="arch">
          <Photo plant={plant} />
          {!inStock(plant) && <SoldBadge />}
        </div>
        <div>
          <p className="muted">{categoryLabel(plant.category)} · <span className={plant.stock > 3 && inStock(plant) ? "" : "low"}>{stockText(plant)}</span></p>
          <h1>{plant.name}</h1>
          {plant.altName && <p className="muted">{plant.altName}</p>}
          <p className="plant-price"><strong>{money(plant.price)}</strong> estimated, per plant</p>
          {plant.description && <p>{plant.description}</p>}
          <dl className="care">
            {care.map(([term, value]) => <div key={term}><dt>{term}</dt><dd>{value}</dd></div>)}
          </dl>
          {inStock(plant) && (
            <div className="add-row">
              <Stepper value={qty} max={plant.stock} label={plant.name} onChange={(n) => setLocalQty(Math.max(1, n))} />
              <button type="button" className="btn" onClick={addToBasket}>Add to basket · {money(plant.price * qty)}</button>
            </div>
          )}
          <p className="muted small">This is an inquiry, not an order. {config.ownerName} will confirm stock and price on WhatsApp before you come to collect.</p>
        </div>
      </div>
    </div>
  );
}
