import { Dialog } from "../components/Dialog";
import { Photo, Stepper } from "../components/ui";
import { config } from "../config";
import { money } from "../lib/format";
import { useStore } from "../store";

export function BasketDrawer() {
  const { lines, items, count, total, setQty, basketOpen, setBasketOpen } = useStore();
  const close = () => setBasketOpen(false);

  return (
    <Dialog open={basketOpen} onClose={close} label="Basket" variant="drawer">
      <div className="drawer">
        <header className="drawer-head">
          <h2>Garden Basket <span className="count">{count}</span></h2>
          <button type="button" className="icon-btn" onClick={close} aria-label="Close basket">×</button>
        </header>
        <p className="muted small drawer-note">Self pickup at {config.pickupPlace} · {config.pickupHours}</p>

        <ul className="drawer-lines">
          {lines.map(({ plant, qty, soldOut }) => (
            <li key={plant.id} className={soldOut ? "line is-sold" : "line"}>
              <div className="line-thumb"><Photo plant={plant} /></div>
              <div>
                <h3>{plant.name}</h3>
                {soldOut
                  ? <p className="low small">Sold out, so it won't be included.</p>
                  : <Stepper value={qty} max={plant.stock} label={plant.name} onChange={(n) => setQty(plant, n)} />}
              </div>
              <div className="line-end">
                {!soldOut && <strong>{money(plant.price * qty)}</strong>}
                <button type="button" className="link-btn" onClick={() => setQty(plant, 0)} aria-label={`Remove ${plant.name}`}>Remove</button>
              </div>
            </li>
          ))}
        </ul>

        {lines.length === 0 && (
          <div className="notice drawer-empty">
            <p>Your basket is empty.</p>
            <button type="button" className="btn btn-quiet" onClick={close}>See the catalog</button>
          </div>
        )}

        {items.length > 0 && (
          <footer className="drawer-foot">
            <p className="total"><span>Estimated total</span> <strong>{money(total)}</strong></p>
            <a className="btn btn-wide" href="#/checkout" onClick={close}>Continue to checkout</a>
          </footer>
        )}
      </div>
    </Dialog>
  );
}
