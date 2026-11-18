import { useEffect, useState } from "react";
import { Admin } from "./admin/Admin";
import { config } from "./config";
import { Shop } from "./shop/Shop";
import { StoreProvider } from "./store";

/** The addresses were Malay before the site moved to English, and old links are still shared. */
const OLD_ROUTES: [RegExp, string][] = [
  [/^\/pokok\//, "/plant/"],
  [/^\/tempahan$/, "/checkout"],
  [/^\/terima-kasih$/, "/thank-you"],
  [/^\/\?halaman=/, "/?page="],
];

function currentRoute() {
  const route = window.location.hash.slice(1) || "/";
  const renamed = OLD_ROUTES.reduce((r, [from, to]) => r.replace(from, to), route);
  if (renamed !== route) window.location.replace(`#${renamed}`);
  return renamed;
}

/** Hash routes, because GitHub Pages can't serve an SPA fallback for real paths. */
export function App() {
  const [route, setRoute] = useState(currentRoute);

  useEffect(() => {
    const onChange = () => {
      const next = currentRoute();
      setRoute(next);
      // The catalog scrolls itself: to a page's first plants, or back to the plant just viewed.
      if (next.split("?")[0] !== "/") window.scrollTo(0, 0);
    };
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);

  const isAdmin = route.startsWith("/admin");

  useEffect(() => {
    document.title = isAdmin ? `Admin · ${config.shopName}` : config.shopName;
  }, [isAdmin]);

  return <StoreProvider>{isAdmin ? <Admin /> : <Shop route={route} />}</StoreProvider>;
}
