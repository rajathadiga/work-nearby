"use client";
import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";

export type MapMarker = { lat: number; lng: number; emoji?: string; popup?: string; size?: number; onClick?: () => void };
export type MapCircle = { lat: number; lng: number; radius: number; color: string; opacity?: number };

type Props = {
  center: [number, number];
  zoom?: number;
  markers?: MapMarker[];
  circles?: MapCircle[];
  line?: [number, number][];
  onPick?: (lat: number, lng: number) => void;
  height?: number | string;
  fit?: boolean;
  className?: string;
};

/** Leaflet + OpenStreetMap (no API key). Emoji pins keep it readable for everyone. */
export default function MapView({ center, zoom = 13, markers = [], circles = [], line, onPick, height = 260, fit = false, className = "" }: Props) {
  const el = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const layerRef = useRef<any>(null);
  const LRef = useRef<any>(null);
  const pickRef = useRef(onPick);
  pickRef.current = onPick;

  useEffect(() => {
    let cancelled = false;
    import("leaflet").then((mod) => {
      if (cancelled || !el.current || mapRef.current) return;
      const L = (mod as any).default || mod;
      LRef.current = L;
      const map = L.map(el.current, { zoomControl: true, attributionControl: true }).setView(center, zoom);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "© OpenStreetMap" }).addTo(map);
      map.on("click", (e: any) => pickRef.current?.(e.latlng.lat, e.latlng.lng));
      mapRef.current = map;
      layerRef.current = L.layerGroup().addTo(map);
      draw();
      setTimeout(() => map.invalidateSize(), 200);
    });
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function draw() {
    const L = LRef.current;
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!L || !map || !layer) return;
    layer.clearLayers();
    circles.forEach((c) => L.circle([c.lat, c.lng], { radius: c.radius, color: c.color, weight: 0, fillOpacity: c.opacity ?? 0.25 }).addTo(layer));
    if (line && line.length > 1) L.polyline(line, { color: "#ea580c", weight: 5, dashArray: "8 8" }).addTo(layer);
    const pts: [number, number][] = [];
    markers.forEach((mk) => {
      const size = mk.size || 28;
      const icon = L.divIcon({ className: "", html: `<div class="emoji-pin" style="font-size:${size}px">${mk.emoji || "📍"}</div>`, iconSize: [size, size], iconAnchor: [size / 2, size] });
      const m = L.marker([mk.lat, mk.lng], { icon }).addTo(layer);
      if (mk.popup) m.bindPopup(mk.popup);
      if (mk.onClick) m.on("click", mk.onClick);
      pts.push([mk.lat, mk.lng]);
    });
    if (fit && pts.length > 1) map.fitBounds(pts, { padding: [30, 30], maxZoom: 15 });
  }

  useEffect(() => {
    draw();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(markers.map((m) => [m.lat, m.lng, m.emoji, m.popup])), JSON.stringify(circles), JSON.stringify(line)]);

  useEffect(() => {
    if (mapRef.current && !fit) mapRef.current.setView(center, mapRef.current.getZoom());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [center[0], center[1]]);

  return <div ref={el} className={`w-full rounded-2xl overflow-hidden border border-black/5 ${className}`} style={{ height }} />;
}
