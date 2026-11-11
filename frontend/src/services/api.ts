// Types mirror backend/app/schemas.py and the dict built in route_service.py.

export interface Location {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
}

export interface RouteRequest {
  warehouse: Location;
  deliveries: Location[];
}

export interface OptimizedStop extends Location {
  sequence: number;
  type: "warehouse" | "delivery";
}

export interface RouteResponse {
  status: string;
  number_of_deliveries: number;
  total_travel_time_seconds: number;
  total_travel_time_minutes: number;
  route_indices: number[];
  optimized_route: OptimizedStop[];
  route_geometry: [number, number][]; // [lat, lng] points along the roads
}

// In dev this hits the Vite proxy (see vite.config.ts). Set VITE_API_URL for a deployed backend.
const BASE = import.meta.env.VITE_API_URL ?? "/api";

// FastAPI returns `detail` as a string for HTTPException and as a list for validation errors.
async function readError(res: Response): Promise<string> {
  try {
    const body = await res.json();
    if (typeof body.detail === "string") return body.detail;
    if (Array.isArray(body.detail)) {
      return body.detail
        .map((d: { loc: (string | number)[]; msg: string }) => `${d.loc.slice(1).join(".")}: ${d.msg}`)
        .join("\n");
    }
  } catch {
    /* body wasn't JSON */
  }
  return `Request failed (${res.status})`;
}

export async function optimizeRoute(payload: RouteRequest): Promise<RouteResponse> {
  let res: Response;
  try {
    res = await fetch(`${BASE}/optimize-route`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new Error("Can't reach the API. Is the backend running on port 8000?");
  }
  if (!res.ok) throw new Error(await readError(res));
  return res.json();
}

export async function checkHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${BASE}/health`);
    return res.ok;
  } catch {
    return false;
  }
}

export interface PlaceResult {
  label: string; // short name used for the stop
  detail: string; // rest of the address, shown under the label in results
  latitude: number;
  longitude: number;
}

// OpenStreetMap's public geocoder. Fine for a test app (max ~1 request/second, no search-as-you-type);
// use your own Nominatim or a hosted geocoder if this ever sees real traffic.
export async function searchPlaces(query: string): Promise<PlaceResult[]> {
  const params = new URLSearchParams({ q: query, format: "jsonv2", limit: "5" });
  let res: Response;
  try {
    res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`);
  } catch {
    throw new Error("Search is unavailable. Check your connection.");
  }
  if (!res.ok) throw new Error(`Search failed (${res.status})`);

  const rows: { name: string; display_name: string; lat: string; lon: string }[] = await res.json();
  return rows.map((r) => {
    const parts = r.display_name.split(", ");
    // Named places start with their name; plain addresses start with a house number, so keep two parts.
    const used = r.name ? 1 : 2;
    return {
      label: r.name || parts.slice(0, used).join(" "),
      detail: parts.slice(used).join(", "),
      latitude: parseFloat(r.lat),
      longitude: parseFloat(r.lon),
    };
  });
}
