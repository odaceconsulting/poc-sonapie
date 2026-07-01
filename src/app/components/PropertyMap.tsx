import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapPin } from "lucide-react";

export interface MapProperty {
  id: string;
  name: string;
  city: string;
  price: number;
  available: boolean;
  lat: number;
  lng: number;
}

const CI_BOUNDS: L.LatLngBoundsExpression = [
  [4.2, -8.7],
  [10.8, -2.4],
];

const fmtPrice = (n: number) => new Intl.NumberFormat("fr-CI").format(n) + " FCFA";

const markerIcon = (available: boolean, active: boolean) =>
  L.divIcon({
    className: "",
    html: `<div style="
      width:34px;height:34px;border-radius:50% 50% 50% 0;
      transform:rotate(-45deg);
      background:${active ? "#15803D" : available ? "#EA580C" : "#9CA3AF"};
      border:3px solid white;
      box-shadow:0 2px 8px rgba(0,0,0,0.35);
      display:flex;align-items:center;justify-content:center;
    "><span style="transform:rotate(45deg);color:white;font-size:14px;font-weight:700;">●</span></div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 34],
    popupAnchor: [0, -34],
  });

interface PropertyMapProps {
  properties: MapProperty[];
  onSelect: (id: string) => void;
  selectedId?: string;
}

export function PropertyMap({ properties, onSelect, selectedId }: PropertyMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [7.5, -5.5],
      zoom: 6,
      minZoom: 5,
      maxZoom: 12,
      maxBounds: CI_BOUNDS,
      maxBoundsViscosity: 0.85,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    if (properties.length === 0) return;

    const bounds = L.latLngBounds([]);

    properties.forEach(p => {
      const latlng: L.LatLngExpression = [p.lat, p.lng];
      bounds.extend(latlng);

      const marker = L.marker(latlng, {
        icon: markerIcon(p.available, p.id === selectedId),
        title: p.name,
      });

      marker.bindPopup(`
        <div style="min-width:180px;font-family:Inter,sans-serif">
          <strong style="font-size:13px;color:#1A1A2E">${p.name}</strong>
          <div style="font-size:11px;color:#6B7280;margin:4px 0">${p.city}</div>
          <div style="font-size:13px;font-weight:700;color:#EA580C">${fmtPrice(p.price)}<span style="font-weight:400;font-size:11px;color:#6B7280"> / nuit</span></div>
          <div style="margin-top:6px;font-size:11px;color:${p.available ? "#16A34A" : "#DC2626"}">${p.available ? "● Disponible" : "● Indisponible"}</div>
        </div>
      `);

      marker.on("click", () => onSelectRef.current(p.id));
      marker.addTo(map);
      markersRef.current.push(marker);
    });

    if (properties.length === 1) {
      map.setView([properties[0].lat, properties[0].lng], 10);
    } else {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 8 });
    }
  }, [properties, selectedId]);

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden sticky top-24">
      <div ref={containerRef} className="h-80 w-full z-0" />
      <div className="p-3 border-t border-border bg-muted/30">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground mb-2">
          <MapPin size={14} className="text-secondary" />
          Carte — Côte d&apos;Ivoire
        </div>
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-primary inline-block" /> Disponible
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-gray-400 inline-block" /> Indisponible
          </span>
          <span>{properties.length} bien{properties.length > 1 ? "s" : ""} affiché{properties.length > 1 ? "s" : ""}</span>
        </div>
        <p className="text-xs text-muted-foreground mt-1.5">Cliquez sur un repère pour ouvrir la fiche du bien</p>
      </div>
    </div>
  );
}
