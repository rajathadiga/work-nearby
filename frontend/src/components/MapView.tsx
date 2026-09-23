"use client";
import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";

export type PinKind = "job" | "urgent" | "worker" | "worker_off" | "home" | "vehicle" | "flag" | "start" | "dot";
export type MapMarker = { lat: number; lng: number; kind?: PinKind; color?: string; popup?: string; size?: number; onClick?: () => void };
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

// lucide-style glyphs (stroke icons) for map pins
const G = (inner: string) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;
const GLYPH: Record<string, string> = {
  job: G('<path d="M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/><rect width="20" height="14" x="2" y="6" rx="2"/>'),
  urgent: G('<path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/>'),
  worker: G('<circle cx="12" cy="7" r="4"/><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/>'),
  worker_off: G('<circle cx="12" cy="7" r="4"/><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/>'),
  home: G('<path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>'),
  vehicle: G('<path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/>'),
  flag: G('<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" x2="4" y1="22" y2="15"/>'),
  start: G('<circle cx="12" cy="12" r="4"/>'),
};
const COLOR: Record<string, string> = {
  job: "#1f6b65",
  urgent: "#be123c",
  worker: "#059669",
  worker_off: "#94a3b8",
  home: "#334155",
  vehicle: "#c2842b",
  flag: "#334155",
  start: "#2f817a",
  dot: "#1f6b65",
};

/** Leaflet + OpenStreetMap (no API key) with clean vector pins. */
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
      const map = L.map(el.current, { zoomControl: true, attributionControl: true, scrollWheelZoom: false }).setView(center, zoom);
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "© OpenStreetMap",
        className: "kn-tiles",
      }).addTo(map);
      map.on("click", (e: any) => pickRef.current?.(e.latlng.lat, e.latlng.lng));
      map.on("focus", () => map.scrollWheelZoom.enable());
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
    circles.forEach((c) => L.circle([c.lat, c.lng], { radius: c.radius, color: c.color, weight: 0, fillOpacity: c.opacity ?? 0.2 }).addTo(layer));
    if (line && line.length > 1) L.polyline(line, { color: "#1f6b65", weight: 4, opacity: 0.85, dashArray: "6 8" }).addTo(layer);
    const pts: [number, number][] = [];
    markers.forEach((mk) => {
      const kind = mk.kind || "job";
      const color = mk.color || COLOR[kind];
      let icon;
      if (kind === "dot") {
        const s = mk.size || 12;
        icon = L.divIcon({ className: "", html: `<div class="map-dot" style="width:${s}px;height:${s}px;background:${color}"></div>`, iconSize: [s, s], iconAnchor: [s / 2, s / 2] });
      } else {
        const s = mk.size || 30;
        icon = L.divIcon({
          className: "",
          html: `<div class="map-pin" style="width:${s}px;height:${s}px;background:${color}">${GLYPH[kind] || GLYPH.job}</div>`,
          iconSize: [s, s],
          iconAnchor: [s / 2, s / 2],
          popupAnchor: [0, -s / 2],
        });
      }
      const m = L.marker([mk.lat, mk.lng], { icon }).addTo(layer);
      if (mk.popup) m.bindPopup(mk.popup);
      if (mk.onClick) m.on("click", mk.onClick);
      pts.push([mk.lat, mk.lng]);
    });
    if (fit && pts.length > 1) map.fitBounds(pts, { padding: [36, 36], maxZoom: 15 });
  }

  useEffect(() => {
    draw();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(markers.map((m) => [m.lat, m.lng, m.kind, m.popup])), JSON.stringify(circles), JSON.stringify(line)]);

  useEffect(() => {
    if (mapRef.current && !fit) mapRef.current.setView(center, mapRef.current.getZoom());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [center[0], center[1]]);

  useEffect(() => {
    const ro = new ResizeObserver(() => mapRef.current?.invalidateSize());
    if (el.current) ro.observe(el.current);
    return () => ro.disconnect();
  }, []);

  return <div ref={el} className={`w-full rounded-xl overflow-hidden border border-line ${className}`} style={{ height }} />;
}
