import { useEffect, useRef, useState } from "react";
import DeliveryMap from "./components/DeliveryMap";
import StopList from "./components/StopList";
import RouteSummary from "./components/RouteSummary";
import SearchBox from "./components/SearchBox";
import { checkHealth, optimizeRoute } from "./services/api";
import type { Location, PlaceResult, RouteResponse } from "./services/api";

const MAX_DELIVERIES = 10; // matches max_length in RouteRequest

const DEFAULT_WAREHOUSE: Location = {
  id: "warehouse",
  name: "Warehouse",
  latitude: 12.9716,
  longitude: 77.5946,
};

// Handy for testing. These are in Bengaluru, so swap them if your OSRM extract covers somewhere else.
const SAMPLE_STOPS: [string, number, number][] = [
  ["Koramangala", 12.9352, 77.6245],
  ["Indiranagar", 12.9784, 77.6408],
  ["Hebbal", 13.0358, 77.597],
  ["Malleshwaram", 13.0035, 77.5647],
  ["Jayanagar", 12.9299, 77.5838],
  ["HSR Layout", 12.9116, 77.6474],
];

export default function App() {
  const [warehouse, setWarehouse] = useState<Location>(DEFAULT_WAREHOUSE);
  const [deliveries, setDeliveries] = useState<Location[]>([]);
  const [result, setResult] = useState<RouteResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [apiOnline, setApiOnline] = useState<boolean | null>(null);
  const [focus, setFocus] = useState<[number, number] | null>(null);
  const nextId = useRef(1);

  useEffect(() => {
    const ping = () => checkHealth().then(setApiOnline);
    ping();
    const timer = setInterval(ping, 10000);
    return () => clearInterval(timer);
  }, []);

  // Any change to the stops makes the previous result stale, so drop it.
  function edit(change: () => void) {
    if (loading) return;
    change();
    setResult(null);
    setError(null);
  }

  function addStop(lat: number, lng: number, name?: string) {
    if (deliveries.length >= MAX_DELIVERIES) return;
    edit(() => {
      const n = nextId.current++;
      setDeliveries((prev) => [...prev, { id: `d${n}`, name: name ?? `Stop ${n}`, latitude: lat, longitude: lng }]);
    });
  }

  function addSearchedStop(place: PlaceResult) {
    addStop(place.latitude, place.longitude, place.label);
    setFocus([place.latitude, place.longitude]);
  }

  function moveStop(id: string, lat: number, lng: number) {
    edit(() => {
      if (id === warehouse.id) {
        setWarehouse((w) => ({ ...w, latitude: lat, longitude: lng }));
      } else {
        setDeliveries((prev) => prev.map((d) => (d.id === id ? { ...d, latitude: lat, longitude: lng } : d)));
      }
    });
  }

  function renameStop(id: string, name: string) {
    edit(() => {
      if (id === warehouse.id) {
        setWarehouse((w) => ({ ...w, name }));
      } else {
        setDeliveries((prev) => prev.map((d) => (d.id === id ? { ...d, name } : d)));
      }
    });
  }

  function removeStop(id: string) {
    edit(() => setDeliveries((prev) => prev.filter((d) => d.id !== id)));
  }

  function loadSample() {
    edit(() => {
      setWarehouse(DEFAULT_WAREHOUSE);
      setDeliveries(SAMPLE_STOPS.map(([name, latitude, longitude], i) => ({ id: `d${i + 1}`, name, latitude, longitude })));
      nextId.current = SAMPLE_STOPS.length + 1;
    });
  }

  function clearStops() {
    edit(() => {
      setDeliveries([]);
      nextId.current = 1;
    });
  }

  async function handleOptimize() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      setResult(await optimizeRoute({ warehouse, deliveries }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <header className="masthead">
          <div>
            <h1>Route Optimizer</h1>
            <p>One vehicle, round trip from the warehouse</p>
          </div>
          <span className={`status ${apiOnline === null ? "" : apiOnline ? "status--on" : "status--off"}`}>
            <i />
            {apiOnline === null ? "Checking" : apiOnline ? "API online" : "API offline"}
          </span>
        </header>

        <SearchBox disabled={loading} full={deliveries.length >= MAX_DELIVERIES} onPick={addSearchedStop} />

        <StopList
          warehouse={warehouse}
          deliveries={deliveries}
          route={result?.optimized_route ?? null}
          max={MAX_DELIVERIES}
          disabled={loading}
          onRename={renameStop}
          onRemove={removeStop}
          onLoadSample={loadSample}
          onClear={clearStops}
        />

        <RouteSummary
          result={result}
          loading={loading}
          error={error}
          deliveryCount={deliveries.length}
          onOptimize={handleOptimize}
        />
      </aside>

      <main className="map-pane">
        <DeliveryMap
          warehouse={warehouse}
          deliveries={deliveries}
          route={result?.optimized_route ?? null}
          path={result?.route_geometry ?? null}
          focus={focus}
          onMapClick={addStop}
          onMarkerMove={moveStop}
        />
      </main>
    </div>
  );
}
