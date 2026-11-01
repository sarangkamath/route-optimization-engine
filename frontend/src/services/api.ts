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
