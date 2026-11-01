import type { RouteResponse } from "../services/api";

interface Props {
  result: RouteResponse | null;
  loading: boolean;
  error: string | null;
  deliveryCount: number;
  onOptimize: () => void;
}

function formatDuration(totalSeconds: number) {
  const minutes = Math.round(totalSeconds / 60);
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h} h ${m} min` : `${m} min`;
}

export default function RouteSummary({ result, loading, error, deliveryCount, onOptimize }: Props) {
  return (
    <section className="summary">
      {result && (
        <>
          <div className="total">
            <span className="label">Total drive time</span>
            <span className="total-value">{formatDuration(result.total_travel_time_seconds)}</span>
          </div>

          <dl className="facts">
            <div>
              <dt>Deliveries</dt>
              <dd>{result.number_of_deliveries}</dd>
            </div>
            <div>
              <dt>Seconds</dt>
              <dd>{result.total_travel_time_seconds.toLocaleString()}</dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>{result.status}</dd>
            </div>
          </dl>

          <details className="raw">
            <summary>Raw response</summary>
            <pre>{JSON.stringify(result, null, 2)}</pre>
          </details>
        </>
      )}

      {error && <p className="error">{error}</p>}

      <button className="primary" onClick={onOptimize} disabled={loading || deliveryCount < 1}>
        {loading ? "Optimizing…" : result ? "Re-run optimization" : "Optimize route"}
      </button>
    </section>
  );
}
