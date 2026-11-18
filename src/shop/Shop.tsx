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
  const browsing = path === "/" || path.startsWith("/plant/");

  return (
    <>
      {isDemo && (
        <p className="demo-note">Preview: these names, prices and stock are examples until the shop is connected to the Google Sheet.</p>
      )}
      <header className="site-header">
        <a className="wordmark" href="#/"><Sprout />{config.shopName}</a>
        <button type="button" className="basket-link" onClick={() => setBasketOpen(true)}>
          <BasketIcon /> Basket <span className="count">{count}</span>
        </button>
      </header>

      <main>
        {path.startsWith("/plant/") ? <PlantPage id={decodeURIComponent(path.slice(7))} />
          : path === "/checkout" ? <Checkout />
          : path === "/thank-you" ? <ThankYou />
          : <Catalog route={route} askedPage={Number(new URLSearchParams(query).get("page")) || 1} />}
      </main>

      <footer className="site-footer">
        <span>{config.shopName} · {config.pickupArea}</span>
        <a href="#/admin">Admin login</a>
      </footer>

      {browsing && lines.length > 0 && (
        <button type="button" className="basket-float" onClick={() => setBasketOpen(true)}>
          <BasketIcon /> {count} {count === 1 ? "plant" : "plants"} <strong>{money(total)}</strong>
        </button>
      )}
      <BasketDrawer />
    </>
  );
}
