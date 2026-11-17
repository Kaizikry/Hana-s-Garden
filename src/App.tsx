import { useEffect, useState } from "react";
import { Admin } from "./admin/Admin";
import { config } from "./config";
import { Shop } from "./shop/Shop";
import { StoreProvider } from "./store";

const currentRoute = () => window.location.hash.slice(1) || "/";

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
