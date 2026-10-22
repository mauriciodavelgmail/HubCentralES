"use client";

import { useEffect, useRef, useState } from "react";

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

export type HeatMetric =
  | "total"
  | "present"
  | "notPresent"
  | "absent"
  | "pending";

export interface HeatLocation {
  city: string;
  neighborhood: string;
  total: number;
  present: number;
  notPresent: number;
  absent: number;
  pending: number;
  latitude: number | null;
  longitude: number | null;
}

export function ParticipantHeatMap({
  locations,
  metric,
  absenceLabel,
  aggregate = false,
}: {
  locations: HeatLocation[];
  metric: HeatMetric;
  absenceLabel: string;
  aggregate?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mapError, setMapError] = useState("");

  useEffect(() => {
    if (!containerRef.current) return;
    let cancelled = false;
    let map: import("leaflet").Map | null = null;
    setMapError("");

    void (async () => {
      try {
        const leafletModule = await import("leaflet");
        const L = leafletModule.default;

        // leaflet.heat is distributed as a browser plugin and expects the
        // Leaflet namespace to exist globally before its module is evaluated.
        (window as typeof window & { L: typeof L }).L = L;
        await import("leaflet.heat");

        if (cancelled || !containerRef.current) return;
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
                `<strong>${escapeHtml(item.neighborhood)}</strong><br>${escapeHtml(item.city)}<br>Total: ${item.total}<br>Presentes: ${item.present}<br>${aggregate ? `Ausentes: ${item.absent}<br>Não confirmados: ${item.pending}` : `${escapeHtml(absenceLabel)}: ${item.notPresent}`}`,
              )
              .addTo(map!);
          });
          map.fitBounds(
            L.latLngBounds(points.map((item) => [item.latitude, item.longitude])),
            { padding: [35, 35], maxZoom: 14 },
          );
        }
      } catch (error) {
        console.error("Erro ao carregar mapa de calor:", error);
        if (!cancelled)
          setMapError("Não foi possível carregar o mapa. Atualize a página e tente novamente.");
      }
    })();

    return () => {
      cancelled = true;
      map?.remove();
    };
  }, [absenceLabel, aggregate, locations, metric]);

  return (
    <div className="relative">
      <div
        ref={containerRef}
        className="h-[420px] w-full rounded-lg bg-slate-100"
        aria-label="Mapa de calor de participantes por cidade e bairro"
      />
      {mapError && (
        <div className="absolute inset-0 flex items-center justify-center rounded-lg border border-red-200 bg-red-50 p-6 text-center text-sm text-red-700">
          {mapError}
        </div>
      )}
    </div>
  );
}
