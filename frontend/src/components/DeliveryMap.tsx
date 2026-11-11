import { useEffect } from "react";
import L from "leaflet";
import { MapContainer, Marker, Polyline, TileLayer, useMap, useMapEvents } from "react-leaflet";
import type { Location, OptimizedStop } from "../services/api";

interface Props {
  warehouse: Location;
  deliveries: Location[];
  route: OptimizedStop[] | null;
  path: [number, number][] | null;
  focus: L.LatLngTuple | null;
  onMapClick: (lat: number, lng: number) => void;
  onMarkerMove: (id: string, lat: number, lng: number) => void;
}

const START_CENTER: L.LatLngTuple = [12.9716, 77.5946];

type PinVariant = "warehouse" | "pending" | "routed";

function pinIcon(label: string, variant: PinVariant) {
  return L.divIcon({
    className: "pin-wrap",
    html: `<div class="pin pin--${variant}">${label}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

function ClickHandler({ onClick }: { onClick: (lat: number, lng: number) => void }) {
  useMapEvents({ click: (e) => onClick(e.latlng.lat, e.latlng.lng) });
  return null;
}

// Re-frame the map whenever a new route comes back.
function FitToRoute({ route }: { route: OptimizedStop[] | null }) {
  const map = useMap();
  useEffect(() => {
    if (!route) return;
    const points = route.map((s) => [s.latitude, s.longitude] as L.LatLngTuple);
    map.fitBounds(points, { padding: [70, 70] });
  }, [route, map]);
  return null;
}

// Centre on a searched place, zoomed in far enough to fine-tune the pin by a block or so.
function FlyTo({ target }: { target: L.LatLngTuple | null }) {
  const map = useMap();
  useEffect(() => {
    if (target) map.flyTo(target, Math.max(map.getZoom(), 16));
  }, [target, map]);
  return null;
}

export default function DeliveryMap({ warehouse, deliveries, route, path, focus, onMapClick, onMarkerMove }: Props) {
  const sequenceById = new Map(route?.map((s) => [s.id, s.sequence]) ?? []);

  const dragEnd = (id: string) => ({
    dragend: (e: L.LeafletEvent) => {
      const { lat, lng } = (e.target as L.Marker).getLatLng();
      onMarkerMove(id, lat, lng);
    },
  });

  return (
    <div className="map-wrap">
      <MapContainer center={START_CENTER} zoom={12} className="map">
        <TileLayer
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          maxZoom={19}
        />
        <ClickHandler onClick={onMapClick} />
        <FitToRoute route={route} />
        <FlyTo target={focus} />

        {path && (
          <>
            {/* white casing under the line keeps it readable on busy streets */}
            <Polyline positions={path} pathOptions={{ color: "#fff", weight: 8, opacity: 0.9 }} />
            <Polyline positions={path} pathOptions={{ color: "#0e5a4a", weight: 4, opacity: 1 }} />
          </>
        )}

        <Marker
          position={[warehouse.latitude, warehouse.longitude]}
          icon={pinIcon("W", "warehouse")}
          draggable
          eventHandlers={dragEnd(warehouse.id)}
        />

        {deliveries.map((d, i) => {
          const seq = sequenceById.get(d.id);
          return (
            <Marker
              key={d.id}
              position={[d.latitude, d.longitude]}
              icon={seq !== undefined ? pinIcon(String(seq), "routed") : pinIcon(String(i + 1), "pending")}
              draggable
              eventHandlers={dragEnd(d.id)}
            />
          );
        })}
      </MapContainer>

      <p className="map-hint">
        {route ? "Route follows the road network." : "Click the map or search to add a stop. Drag any pin to move it."}
      </p>
    </div>
  );
}
