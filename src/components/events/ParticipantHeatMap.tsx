"use client";

import { useEffect, useRef } from "react";

const escapeHtml = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
      })[character]!,
  );

export type HeatMetric = "total" | "present" | "notPresent";

export interface HeatLocation {
  city: string;
  neighborhood: string;
  total: number;
  present: number;
  notPresent: number;
  latitude: number | null;
  longitude: number | null;
}

export function ParticipantHeatMap({
  locations,
  metric,
  absenceLabel,
}: {
  locations: HeatLocation[];
  metric: HeatMetric;
  absenceLabel: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    let cancelled = false;
    let map: import("leaflet").Map | null = null;

    void Promise.all([import("leaflet"), import("leaflet.heat")]).then(
      ([leafletModule]) => {
        if (cancelled || !containerRef.current) return;
        const L = leafletModule.default;
        const points = locations.filter(
          (item): item is HeatLocation & { latitude: number; longitude: number } =>
            item.latitude != null && item.longitude != null,
        );
        map = L.map(containerRef.current, {
          center: [-20.285, -40.31],
          zoom: 11,
          scrollWheelZoom: false,
        });
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
          maxZoom: 19,
        }).addTo(map);

        if (points.length) {
          const maxValue = Math.max(...points.map((item) => item[metric]), 1);
          L.heatLayer(
            points.map((item) => [
              item.latitude,
              item.longitude,
              item[metric] / maxValue,
            ]),
            {
              radius: 34,
              blur: 28,
              maxZoom: 15,
              minOpacity: 0.35,
              gradient: {
                0.15: "#2563eb",
                0.4: "#22c55e",
                0.65: "#facc15",
                1: "#dc2626",
              },
            },
          ).addTo(map);

          points.forEach((item) => {
            L.circleMarker([item.latitude, item.longitude], {
              radius: 6,
              color: "#1e3a8a",
              weight: 1,
              fillColor: "#ffffff",
              fillOpacity: 0.85,
            })
              .bindTooltip(
                `<strong>${escapeHtml(item.neighborhood)}</strong><br>${escapeHtml(item.city)}<br>Total: ${item.total}<br>Presentes: ${item.present}<br>${escapeHtml(absenceLabel)}: ${item.notPresent}`,
              )
              .addTo(map!);
          });
          map.fitBounds(
            L.latLngBounds(points.map((item) => [item.latitude, item.longitude])),
            { padding: [35, 35], maxZoom: 14 },
          );
        }
      },
    );

    return () => {
      cancelled = true;
      map?.remove();
    };
  }, [absenceLabel, locations, metric]);

  return (
    <div
      ref={containerRef}
      className="h-[420px] w-full rounded-lg bg-slate-100"
      aria-label="Mapa de calor de participantes por cidade e bairro"
    />
  );
}
