import type { Location, OptimizedStop } from "../services/api";

interface Props {
  warehouse: Location;
  deliveries: Location[];
  route: OptimizedStop[] | null;
  max: number;
  disabled: boolean;
  onRename: (id: string, name: string) => void;
  onRemove: (id: string) => void;
  onLoadSample: () => void;
  onClear: () => void;
}

const coords = (s: Location) => `${s.latitude.toFixed(5)}, ${s.longitude.toFixed(5)}`;

export default function StopList(props: Props) {
  const { warehouse, deliveries, route, max, disabled, onRename, onRemove, onLoadSample, onClear } = props;

  return (
    <section className="stops-panel">
      <div className="panel-head">
        <h2>
          Stops <span className="count">{deliveries.length}/{max}</span>
        </h2>
        <div className="head-actions">
          <button className="link" onClick={onLoadSample} disabled={disabled}>
            Load sample
          </button>
          <button className="link" onClick={onClear} disabled={disabled || deliveries.length === 0}>
            Clear
          </button>
        </div>
      </div>

      {route ? (
        <ol className="stops">
          {route.map((s, i) => (
            <li className="stop" key={`${s.id}-${i}`}>
              <span className={`badge ${s.type === "warehouse" ? "badge--warehouse" : "badge--routed"}`}>
                {s.type === "warehouse" ? "W" : s.sequence}
              </span>
              <div className="stop-body">
                <span className="stop-name">{s.name}</span>
                <span className="coords">{coords(s)}</span>
              </div>
              {i === 0 && <span className="tag">Start</span>}
              {i === route.length - 1 && <span className="tag">Return</span>}
            </li>
          ))}
        </ol>
      ) : (
        <ol className="stops">
          <li className="stop">
            <span className="badge badge--warehouse">W</span>
            <div className="stop-body">
              <input
                value={warehouse.name}
                onChange={(e) => onRename(warehouse.id, e.target.value)}
                disabled={disabled}
                aria-label="Warehouse name"
              />
              <span className="coords">{coords(warehouse)}</span>
            </div>
            <span className="tag">Start</span>
          </li>

          {deliveries.map((d, i) => (
            <li className="stop" key={d.id}>
              <span className="badge">{i + 1}</span>
              <div className="stop-body">
                <input
                  value={d.name}
                  onChange={(e) => onRename(d.id, e.target.value)}
                  disabled={disabled}
                  aria-label={`Name for stop ${i + 1}`}
                />
                <span className="coords">{coords(d)}</span>
              </div>
              <button className="icon-btn" onClick={() => onRemove(d.id)} disabled={disabled} aria-label={`Remove ${d.name}`}>
                ×
              </button>
            </li>
          ))}

          {deliveries.length === 0 && (
            <li className="empty">No deliveries yet. Click the map to drop a stop, or load a sample set.</li>
          )}
        </ol>
      )}
    </section>
  );
}
