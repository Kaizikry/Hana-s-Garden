import { BasketIcon, Sprout } from "../components/ui";
import { config, isDemo } from "../config";
import { money } from "../lib/format";
import { useStore } from "../store";
import { BasketDrawer } from "./BasketDrawer";
import { Catalog } from "./Catalog";
import { Checkout } from "./Checkout";
import { PlantPage } from "./PlantPage";
import { ThankYou } from "./ThankYou";

export function Shop({ route }: { route: string }) {
  const { count, total, lines, setBasketOpen } = useStore();
  const [path, query = ""] = route.split("?");
  const browsing = path === "/" || path.startsWith("/pokok/");

  return (
    <>
      {isDemo && (
        <p className="demo-note">Pratonton: nama, harga dan stok ini contoh sahaja sehingga kedai disambungkan ke Google Sheet.</p>
      )}
      <header className="site-header">
        <a className="wordmark" href="#/"><Sprout />{config.shopName}</a>
        <button type="button" className="basket-link" onClick={() => setBasketOpen(true)}>
          <BasketIcon /> Bakul <span className="count">{count}</span>
        </button>
      </header>

      <main>
        {path.startsWith("/pokok/") ? <PlantPage id={decodeURIComponent(path.slice(7))} />
          : path === "/tempahan" ? <Checkout />
          : path === "/terima-kasih" ? <ThankYou />
          : <Catalog route={route} askedPage={Number(new URLSearchParams(query).get("halaman")) || 1} />}
      </main>

      <footer className="site-footer">
        <span>{config.shopName} · {config.pickupArea}</span>
        <a href="#/admin">Log masuk admin</a>
      </footer>

      {browsing && lines.length > 0 && (
        <button type="button" className="basket-float" onClick={() => setBasketOpen(true)}>
          <BasketIcon /> {count} pokok <strong>{money(total)}</strong>
        </button>
      )}
      <BasketDrawer />
    </>
  );
}
