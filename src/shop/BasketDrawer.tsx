import { Dialog } from "../components/Dialog";
import { Photo, Stepper } from "../components/ui";
import { config } from "../config";
import { money } from "../lib/format";
import { useStore } from "../store";

export function BasketDrawer() {
  const { lines, items, count, total, setQty, basketOpen, setBasketOpen } = useStore();
  const close = () => setBasketOpen(false);

  return (
    <Dialog open={basketOpen} onClose={close} label="Bakul" variant="drawer">
      <div className="drawer">
        <header className="drawer-head">
          <h2>Bakul Taman <span className="count">{count}</span></h2>
          <button type="button" className="icon-btn" onClick={close} aria-label="Tutup bakul">×</button>
        </header>
        <p className="muted small drawer-note">Ambil sendiri di {config.pickupPlace} · {config.pickupHours}</p>

        <ul className="drawer-lines">
          {lines.map(({ plant, qty, soldOut }) => (
            <li key={plant.id} className={soldOut ? "line is-sold" : "line"}>
              <div className="line-thumb"><Photo plant={plant} /></div>
              <div>
                <h3>{plant.name}</h3>
                {soldOut
                  ? <p className="low small">Sudah habis dijual, jadi tidak akan dimasukkan.</p>
                  : <Stepper value={qty} max={plant.stock} label={plant.name} onChange={(n) => setQty(plant, n)} />}
              </div>
              <div className="line-end">
                {!soldOut && <strong>{money(plant.price * qty)}</strong>}
                <button type="button" className="link-btn" onClick={() => setQty(plant, 0)} aria-label={`Buang ${plant.name}`}>Buang</button>
              </div>
            </li>
          ))}
        </ul>

        {lines.length === 0 && (
          <div className="notice drawer-empty">
            <p>Bakul anda masih kosong.</p>
            <button type="button" className="btn btn-quiet" onClick={close}>Lihat katalog</button>
          </div>
        )}

        {items.length > 0 && (
          <footer className="drawer-foot">
            <p className="total"><span>Jumlah anggaran</span> <strong>{money(total)}</strong></p>
            <a className="btn btn-wide" href="#/tempahan" onClick={close}>Teruskan ke tempahan</a>
          </footer>
        )}
      </div>
    </Dialog>
  );
}
