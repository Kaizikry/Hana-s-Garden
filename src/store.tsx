import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { fetchShop } from "./lib/api";
import { local, readJson, writeJson } from "./lib/storage";
import { basketTotal } from "./lib/whatsapp";
import { inStock, type BasketItem, type Plant } from "./types";

const BASKET_KEY = "garden.basket";

function useStoreValue() {
  const [plants, setPlants] = useState<Plant[]>([]);
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [quantities, setQuantities] = useState<Record<string, number>>(() => readJson(local, BASKET_KEY) ?? {});
  const [basketOpen, setBasketOpen] = useState(false);

  const reload = useCallback(() => {
    setStatus("loading");
    fetchShop()
      .then((shop) => {
        setPlants(shop.plants);
        setWhatsappNumber(shop.whatsappNumber);
        setStatus("ready");
      })
      .catch(() => setStatus("error"));
  }, []);
  useEffect(reload, [reload]);

  useEffect(() => {
    writeJson(local, BASKET_KEY, quantities);
  }, [quantities]);

  const setQty = useCallback((plant: Plant, qty: number) => {
    setQuantities(({ [plant.id]: _old, ...rest }) => {
      const clamped = Math.min(qty, plant.stock);
      return clamped > 0 ? { ...rest, [plant.id]: clamped } : rest;
    });
  }, []);

  const clearBasket = useCallback(() => setQuantities({}), []);

  // Prices and stock come from the catalog, so a basket saved last week can't go stale.
  const lines = useMemo(
    () =>
      plants
        .filter((plant) => quantities[plant.id])
        .map((plant) => ({ plant, qty: Math.min(quantities[plant.id], plant.stock), soldOut: !inStock(plant) })),
    [plants, quantities],
  );
  const items = useMemo<BasketItem[]>(
    () =>
      lines
        .filter((line) => !line.soldOut)
        .map(({ plant, qty }) => ({ id: plant.id, name: plant.name, price: plant.price, qty })),
    [lines],
  );

  return {
    plants, setPlants, whatsappNumber, status, reload, lines, items, setQty, clearBasket, basketOpen, setBasketOpen,
    qtyOf: (id: string) => quantities[id] ?? 0,
    count: items.reduce((sum, item) => sum + item.qty, 0),
    total: basketTotal(items),
  };
}

const StoreContext = createContext<ReturnType<typeof useStoreValue> | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  return <StoreContext.Provider value={useStoreValue()}>{children}</StoreContext.Provider>;
}

export const useStore = () => useContext(StoreContext)!;
