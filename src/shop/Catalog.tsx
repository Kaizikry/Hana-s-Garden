import { useEffect, useMemo, useRef, useState } from "react";
import { Pager } from "../components/Pager";
import { Photo, SoldBadge, stockText, WhatsAppIcon } from "../components/ui";
import { config } from "../config";
import { money, toWhatsAppNumber } from "../lib/format";
import { paginate, shopOrder } from "../lib/pages";
import { readJson, session, writeJson } from "../lib/storage";
import { whatsappUrl } from "../lib/whatsapp";
import { useStore } from "../store";
import { CATEGORIES, categoryLabel, inStock, type Plant } from "../types";

const HERO_PHOTOS = ["images/hero-1.jpeg", "images/hero-2.jpeg", "images/hero-3.jpeg", "images/hero-4.jpeg"];
const PER_PAGE = 12;
const LAST_PLANT = "garden.lastPlant";
const ALL = "All";
export const CATALOG_ROUTE = "garden.catalogRoute";
const pageHref = (n: number) => (n > 1 ? `#/?page=${n}` : "#/");

export function Catalog({ route, askedPage }: { route: string; askedPage: number }) {
  const { plants, status, reload, whatsappNumber } = useStore();
  const [category, setCategory] = useState(ALL);
  const [query, setQuery] = useState("");
  const catalogRef = useRef<HTMLElement>(null);
  const shownPage = useRef<number | null>(null);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return shopOrder(plants).filter(
      (p) => (category === ALL || p.category === category) && (!q || `${p.name} ${p.altName}`.toLowerCase().includes(q)),
    );
  }, [plants, category, query]);
  const { items, page, pages } = paginate(shown, askedPage, PER_PAGE);

  // So the plant page's "← Catalog" link can return to this page.
  useEffect(() => void writeJson(session, CATALOG_ROUTE, route), [route]);

  useEffect(() => {
    const before = shownPage.current;
    if (before === page) return; // React runs effects twice in development; nothing changed
    shownPage.current = page;
    // Statements, not returns: newer browsers return a Promise from scroll calls, which React would treat as a cleanup.
    if (before !== null) {
      catalogRef.current?.scrollIntoView();
      return;
    }
    // Back from a plant: return to its card. A shared page link: go to the plants. Otherwise start at the top.
    const lastId = readJson<string>(session, LAST_PLANT);
    session?.removeItem(LAST_PLANT);
    const card = lastId ? document.getElementById(`plant-${lastId}`) : null;
    if (card) card.scrollIntoView({ block: "center" });
    else if (page > 1) catalogRef.current?.scrollIntoView();
    else window.scrollTo(0, 0);
  }, [page]);

  // A new search or category starts again from page 1, without adding a step to Back.
  const refilter = (apply: () => void) => {
    apply();
    if (page > 1) window.location.replace("#/");
  };

  const usedCategories = CATEGORIES.filter((c) => plants.some((p) => p.category === c));

  return (
    <>
      <Hero onBrowse={() => catalogRef.current?.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" })} />

      <div className="pickup-band">
        <div className="pickup-ask">
          <strong>Want to see the plants in person? WhatsApp {config.ownerName} first.</strong>
          {/* Shown once the number has loaded. The demo has no number, so it has no button. */}
          {whatsappNumber && (
            <a
              className="btn btn-whatsapp"
              href={whatsappUrl(toWhatsAppNumber(whatsappNumber), `Hi ${config.ownerName}, I'd like to come and see the plants.`)}
              target="_blank"
              rel="noreferrer"
            >
              <WhatsAppIcon /> Chat on WhatsApp
            </a>
          )}
        </div>
        <span>{config.pickupHours}</span>
      </div>

      <section className="catalog" aria-label="Plant catalog" ref={catalogRef}>
        <div className="catalog-head">
          <div>
            <h2>Plant catalog</h2>
            <p>All prices are estimates. {config.ownerName} will confirm stock and price on WhatsApp.</p>
          </div>
          <input type="search" aria-label="Search plant names" placeholder="Search plant names…" value={query} onChange={(e) => refilter(() => setQuery(e.target.value))} />
        </div>

        {usedCategories.length > 1 && (
          <div className="tabs" role="group" aria-label="Category">
            {[ALL, ...usedCategories].map((name) => (
              <button key={name} type="button" aria-pressed={category === name} onClick={() => refilter(() => setCategory(name))}>{categoryLabel(name)}</button>
            ))}
          </div>
        )}

        {status === "loading" && plants.length === 0 && <p className="notice" role="status">Loading the plants, one moment.</p>}

        {status === "error" && (
          <div className="notice" role="alert">
            <p>The plant list couldn't be loaded. Check your internet connection and try again.</p>
            <button type="button" className="btn" onClick={reload}>Try again</button>
          </div>
        )}

        {status === "ready" && plants.length === 0 && <p className="notice">No plants are listed yet. Please check back soon.</p>}

        {plants.length > 0 && shown.length === 0 && (
          <div className="notice">
            <p>No plants match that name.</p>
            <button type="button" className="btn btn-quiet" onClick={() => refilter(() => { setQuery(""); setCategory(ALL); })}>See all plants</button>
          </div>
        )}

        <ul className="plant-grid">
          {items.map((plant) => <li key={plant.id} id={`plant-${plant.id}`}><PlantCard plant={plant} /></li>)}
        </ul>
        <Pager page={page} pages={pages} hrefFor={pageHref} />
      </section>
    </>
  );
}

function Hero({ onBrowse }: { onBrowse: () => void }) {
  const trackRef = useRef<HTMLUListElement>(null);
  const [current, setCurrent] = useState(0);

  // On phones the photos become a swipeable row; the arrows and counter only show there.
  const go = (index: number) => {
    const cards = trackRef.current ? [...trackRef.current.children] as HTMLElement[] : [];
    if (cards[index]) trackRef.current!.scrollTo({ left: cards[index].offsetLeft - cards[0].offsetLeft });
  };
  const track = () => {
    const el = trackRef.current;
    const [first, second] = el ? [...el.children] as HTMLElement[] : [];
    if (el && first && second) setCurrent(Math.round(el.scrollLeft / (second.offsetLeft - first.offsetLeft)));
  };
  const count = (n: number) => String(n).padStart(2, "0");

  return (
    <section className="hero">
      <div className="hero-text">
        <h1>Plants from our garden, ready for yours.</h1>
        <p>Pick your plants, add them to the basket, and send one inquiry straight to {config.ownerName} on WhatsApp.</p>
        <button type="button" className="btn hero-btn" onClick={onBrowse}>See the plants</button>
      </div>
      <div className="hero-photos">
        <ul className="hero-track" ref={trackRef} onScroll={track}>
          {HERO_PHOTOS.map((src) => <li key={src}><img src={src} alt="" /></li>)}
        </ul>
        <div className="hero-nav">
          <span aria-hidden="true">{count(current + 1)} <i>/</i> {count(HERO_PHOTOS.length)}</span>
          <button type="button" aria-label="Previous photo" disabled={current === 0} onClick={() => go(current - 1)}>‹</button>
          <button type="button" aria-label="Next photo" disabled={current === HERO_PHOTOS.length - 1} onClick={() => go(current + 1)}>›</button>
        </div>
      </div>
    </section>
  );
}

function PlantCard({ plant }: { plant: Plant }) {
  const { qtyOf, setQty, setBasketOpen } = useStore();
  const href = `#/plant/${encodeURIComponent(plant.id)}`;
  const available = inStock(plant);
  const inBasket = qtyOf(plant.id);
  const remember = () => writeJson(session, LAST_PLANT, plant.id);

  return (
    <article className={available ? "plant-card" : "plant-card is-sold"}>
      <a className="arch" href={href} tabIndex={-1} aria-hidden="true" onClick={remember}>
        <Photo plant={plant} />
        {!available && <SoldBadge />}
      </a>
      <div className="plant-card-title">
        <h3><a href={href} onClick={remember}>{plant.name}</a></h3>
        <strong>{money(plant.price)}</strong>
      </div>
      {plant.altName && <p className="muted">{plant.altName}</p>}
      <div className="plant-card-foot">
        <span className={available && plant.stock > 3 ? "muted" : "low"}>{stockText(plant)}</span>
        {available && (inBasket > 0
          ? <button type="button" className="btn btn-quiet btn-small" onClick={() => setBasketOpen(true)}>In basket · {inBasket}</button>
          : <button type="button" className="btn btn-small" onClick={() => setQty(plant, 1)} aria-label={`Add ${plant.name}`}>Add</button>)}
      </div>
    </article>
  );
}
