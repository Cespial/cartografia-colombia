"use client";

import { useState, useEffect, useMemo, useCallback, useRef, use } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import type { MunicipioIGAC, CoverageStats } from "@/types";
import {
  computeCoverageStats,
  ESTADO_COLORS,
  ESTADO_LABELS,
  formatCOP,
} from "@/lib/coverage";
import type { EstadoCatastral } from "@/types";
import { ArrowLeft, MapPin, Building2, Users, ChevronUp, ChevronDown } from "lucide-react";
import MapGL, {
  Source,
  Layer,
  NavigationControl,
  Popup,
} from "react-map-gl/mapbox";
import type { MapRef, MapMouseEvent } from "react-map-gl/mapbox";
import * as turf from "@turf/turf";
import "mapbox-gl/dist/mapbox-gl.css";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

// ── Department Map (inline, avoids SSR issues via dynamic parent) ───────────

interface DepartmentMapProps {
  geojson: GeoJSON.FeatureCollection | null;
  igacData: MunicipioIGAC[];
  departmentName: string;
  onMunicipioClick?: (codigo: string) => void;
}

interface PopupInfo {
  longitude: number;
  latitude: number;
  name: string;
  estado: string;
  codigo: string;
}

function DepartmentMapInner({
  geojson,
  igacData,
  departmentName,
  onMunicipioClick,
}: DepartmentMapProps) {
  const mapRef = useRef<MapRef>(null);
  const [popup, setPopup] = useState<PopupInfo | null>(null);

  const enrichedGeoJSON = useMemo(() => {
    if (!geojson || igacData.length === 0) return null;

    const igacMap = new Map(igacData.map((m) => [m.nombre.toUpperCase(), m]));

    return {
      type: "FeatureCollection" as const,
      features: geojson.features.map((f) => {
        const name = String(f.properties?.name ?? "").toUpperCase();
        const match = igacMap.get(name);
        return {
          ...f,
          properties: {
            ...f.properties,
            estado: match?.estadoRural ?? "DESACTUALIZADO",
            codigo: match?.codigo ?? "",
          },
        };
      }),
    };
  }, [geojson, igacData]);

  const viewState = useMemo(() => {
    if (!geojson || geojson.features.length === 0) {
      return { longitude: -73.5, latitude: 4.5, zoom: 5 };
    }

    try {
      const bbox = turf.bbox(geojson);
      const center = turf.center(geojson);
      const coords = center.geometry.coordinates;

      const lonSpan = bbox[2] - bbox[0];
      const latSpan = bbox[3] - bbox[1];
      const maxSpan = Math.max(lonSpan, latSpan);
      const zoom = Math.max(6, Math.min(11, Math.log2(360 / maxSpan) - 1));

      return { longitude: coords[0], latitude: coords[1], zoom };
    } catch {
      return { longitude: -73.5, latitude: 4.5, zoom: 5 };
    }
  }, [geojson]);

  const onHover = useCallback((event: MapMouseEvent) => {
    const feature = event.features?.[0];
    if (feature && event.lngLat) {
      setPopup({
        longitude: event.lngLat.lng,
        latitude: event.lngLat.lat,
        name: String(feature.properties?.name ?? ""),
        estado: String(feature.properties?.estado ?? ""),
        codigo: String(feature.properties?.codigo ?? ""),
      });
    } else {
      setPopup(null);
    }
  }, []);

  const onClick = useCallback(
    (event: MapMouseEvent) => {
      const feature = event.features?.[0];
      if (feature?.properties?.codigo && onMunicipioClick) {
        onMunicipioClick(String(feature.properties.codigo));
      }
    },
    [onMunicipioClick]
  );

  if (!geojson) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-900 rounded-xl">
        <p className="text-gray-500">
          No se encontraron limites para {departmentName}
        </p>
      </div>
    );
  }

  return (
    <MapGL
      ref={mapRef}
      initialViewState={viewState}
      style={{ width: "100%", height: "100%" }}
      mapStyle="mapbox://styles/mapbox/dark-v11"
      mapboxAccessToken={MAPBOX_TOKEN}
      interactiveLayerIds={["dept-municipios-fill"]}
      onMouseMove={onHover}
      onMouseLeave={() => setPopup(null)}
      onClick={onClick}
      cursor="pointer"
    >
      <NavigationControl position="top-right" />

      {enrichedGeoJSON && (
        <Source id="dept-municipios" type="geojson" data={enrichedGeoJSON}>
          <Layer
            id="dept-municipios-fill"
            type="fill"
            paint={{
              "fill-color": [
                "match",
                ["get", "estado"],
                "ACTUALIZADO",
                ESTADO_COLORS.ACTUALIZADO,
                "ACTUALIZADO PARCIAL",
                ESTADO_COLORS["ACTUALIZADO PARCIAL"],
                "DESACTUALIZADO",
                ESTADO_COLORS.DESACTUALIZADO,
                "POR FORMAR",
                ESTADO_COLORS["POR FORMAR"],
                "#6b7280",
              ],
              "fill-opacity": 0.7,
            }}
          />
          <Layer
            id="dept-municipios-border"
            type="line"
            paint={{
              "line-color": "#d1d5db",
              "line-width": 1,
            }}
          />
        </Source>
      )}

      {popup && (
        <Popup
          longitude={popup.longitude}
          latitude={popup.latitude}
          closeButton={false}
          closeOnClick={false}
          anchor="bottom"
          className="!p-0"
        >
          <div className="bg-gray-900 text-white p-3 rounded-lg text-sm min-w-[180px]">
            <p className="font-bold">{popup.name}</p>
            <div className="mt-1 flex items-center gap-2">
              <span
                className="w-2.5 h-2.5 rounded-full inline-block"
                style={{
                  backgroundColor:
                    ESTADO_COLORS[popup.estado as EstadoCatastral] ?? "#6b7280",
                }}
              />
              <span className="text-gray-300">
                {ESTADO_LABELS[popup.estado as EstadoCatastral] ?? popup.estado}
              </span>
            </div>
          </div>
        </Popup>
      )}
    </MapGL>
  );
}

// Dynamically imported wrapper to avoid SSR
const DepartmentMap = dynamic(
  () => Promise.resolve(DepartmentMapInner),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full bg-gray-900 rounded-xl flex items-center justify-center">
        <div className="text-gray-500">Cargando mapa...</div>
      </div>
    ),
  }
);

// ── Sortable column types ───────────────────────────────────────────────────

type SortKey =
  | "nombre"
  | "estadoRural"
  | "vigenciaRural"
  | "area"
  | "altitud"
  | "totalPredios"
  | "gestorCatastral";

type SortDir = "asc" | "desc";

// ── Page Component ──────────────────────────────────────────────────────────

export default function DepartamentoPage({
  params,
}: {
  params: Promise<{ codigo: string }>;
}) {
  const { codigo } = use(params);
  const departmentName = decodeURIComponent(codigo);

  const [igacData, setIgacData] = useState<MunicipioIGAC[]>([]);
  const [deptGeoJSON, setDeptGeoJSON] = useState<GeoJSON.FeatureCollection | null>(null);
  const [loading, setLoading] = useState(true);

  // Sorting state
  const [sortKey, setSortKey] = useState<SortKey>("nombre");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  useEffect(() => {
    async function loadData() {
      try {
        const [igacRes, geoRes] = await Promise.all([
          fetch("/api/municipios"),
          fetch("/data/colombia-municipios.json"),
        ]);

        const allMunicipios: MunicipioIGAC[] = await igacRes.json();
        const deptMunicipios = allMunicipios.filter(
          (m) => m.departamento.toUpperCase() === departmentName.toUpperCase()
        );
        setIgacData(deptMunicipios);

        const geoData: GeoJSON.FeatureCollection = await geoRes.json();
        const deptNames = new Set(
          deptMunicipios.map((m) => m.nombre.toUpperCase())
        );
        const deptFeatures = geoData.features.filter((f) => {
          const name = String(f.properties?.name ?? "").toUpperCase();
          return deptNames.has(name);
        });

        if (deptFeatures.length > 0) {
          setDeptGeoJSON({
            type: "FeatureCollection",
            features: deptFeatures,
          });
        }
      } catch (error) {
        console.error("Error loading department data:", error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [departmentName]);

  // ── Computed stats ──────────────────────────────────────────────────────

  const stats: CoverageStats | null = useMemo(
    () => (igacData.length > 0 ? computeCoverageStats(igacData) : null),
    [igacData]
  );

  const totalPredios = useMemo(
    () => igacData.reduce((s, m) => s + (m.totalPredios ?? 0), 0),
    [igacData]
  );

  const avaluoTotal = useMemo(
    () =>
      igacData.reduce(
        (s, m) => s + (m.avaluoRural ?? 0) + (m.avaluoUrbano ?? 0),
        0
      ),
    [igacData]
  );

  // ── Sorted table data ──────────────────────────────────────────────────

  const sortedMunicipios = useMemo(() => {
    const sorted = [...igacData].sort((a, b) => {
      let aVal: string | number | null;
      let bVal: string | number | null;

      switch (sortKey) {
        case "nombre":
          aVal = a.nombre;
          bVal = b.nombre;
          break;
        case "estadoRural":
          aVal = a.estadoRural;
          bVal = b.estadoRural;
          break;
        case "vigenciaRural":
          aVal = a.vigenciaRural;
          bVal = b.vigenciaRural;
          break;
        case "area":
          aVal = a.area;
          bVal = b.area;
          break;
        case "altitud":
          aVal = a.altitud;
          bVal = b.altitud;
          break;
        case "totalPredios":
          aVal = a.totalPredios;
          bVal = b.totalPredios;
          break;
        case "gestorCatastral":
          aVal = a.gestorCatastral;
          bVal = b.gestorCatastral;
          break;
        default:
          aVal = a.nombre;
          bVal = b.nombre;
      }

      // Handle nulls — push them to the end
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;

      if (typeof aVal === "string" && typeof bVal === "string") {
        return sortDir === "asc"
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }

      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortDir === "asc" ? aVal - bVal : bVal - aVal;
      }

      return 0;
    });

    return sorted;
  }, [igacData, sortKey, sortDir]);

  const handleSort = useCallback(
    (key: SortKey) => {
      if (sortKey === key) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      } else {
        setSortKey(key);
        setSortDir("asc");
      }
    },
    [sortKey]
  );

  const handleMunicipioClick = useCallback((codigo: string) => {
    window.location.href = `/municipio/${codigo}`;
  }, []);

  // ── Render helpers ────────────────────────────────────────────────────

  function SortHeader({
    label,
    colKey,
    className,
  }: {
    label: string;
    colKey: SortKey;
    className?: string;
  }) {
    const active = sortKey === colKey;
    return (
      <th
        className={`px-3 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:text-gray-200 select-none ${className ?? ""}`}
        onClick={() => handleSort(colKey)}
      >
        <span className="inline-flex items-center gap-1">
          {label}
          {active &&
            (sortDir === "asc" ? (
              <ChevronUp className="w-3 h-3" />
            ) : (
              <ChevronDown className="w-3 h-3" />
            ))}
        </span>
      </th>
    );
  }

  // ── Loading state ─────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-400 text-sm">Cargando {departmentName}...</p>
        </div>
      </div>
    );
  }

  if (igacData.length === 0) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400 text-lg mb-4">
            Departamento no encontrado: {departmentName}
          </p>
          <Link
            href="/"
            className="text-emerald-400 hover:text-emerald-300 flex items-center gap-2 justify-center"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver al mapa
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <header className="bg-gray-900/95 backdrop-blur-sm border-b border-gray-800 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center gap-4">
          <Link
            href="/"
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-400" />
          </Link>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-white">{departmentName}</h1>
            <p className="text-sm text-gray-500">
              {stats?.total ?? 0} municipios
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {/* Stats cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <Building2 className="w-4 h-4 text-gray-500" />
              <span className="text-xs text-gray-500">Total municipios</span>
            </div>
            <p className="text-lg font-semibold text-white">
              {stats?.total ?? 0}
            </p>
          </div>
          <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <span
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: ESTADO_COLORS.ACTUALIZADO }}
              />
              <span className="text-xs text-gray-500">Actualizados</span>
            </div>
            <p className="text-lg font-semibold text-green-400">
              {(stats?.actualizado ?? 0) + (stats?.actualizadoParcial ?? 0)}
            </p>
          </div>
          <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <span
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: ESTADO_COLORS.DESACTUALIZADO }}
              />
              <span className="text-xs text-gray-500">Desactualizados</span>
            </div>
            <p className="text-lg font-semibold text-orange-400">
              {stats?.desactualizado ?? 0}
            </p>
          </div>
          <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <span
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: ESTADO_COLORS["POR FORMAR"] }}
              />
              <span className="text-xs text-gray-500">Sin cartografia</span>
            </div>
            <p className="text-lg font-semibold text-red-400">
              {stats?.porFormar ?? 0}
            </p>
          </div>
          <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <Users className="w-4 h-4 text-gray-500" />
              <span className="text-xs text-gray-500">Total predios</span>
            </div>
            <p className="text-lg font-semibold text-white">
              {totalPredios.toLocaleString()}
            </p>
          </div>
          <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <MapPin className="w-4 h-4 text-gray-500" />
              <span className="text-xs text-gray-500">Avaluo total</span>
            </div>
            <p className="text-lg font-semibold text-emerald-400">
              {formatCOP(avaluoTotal)}
            </p>
          </div>
        </div>

        {/* Map */}
        <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl overflow-hidden h-[500px]">
          <DepartmentMap
            geojson={deptGeoJSON}
            igacData={igacData}
            departmentName={departmentName}
            onMunicipioClick={handleMunicipioClick}
          />
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 text-sm">
          {(
            Object.entries(ESTADO_LABELS) as [EstadoCatastral, string][]
          ).map(([key, label]) => (
            <div key={key} className="flex items-center gap-2">
              <span
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: ESTADO_COLORS[key] }}
              />
              <span className="text-gray-400">{label}</span>
            </div>
          ))}
        </div>

        {/* Table */}
        <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700/50">
                  <SortHeader label="Municipio" colKey="nombre" />
                  <SortHeader label="Estado Rural" colKey="estadoRural" />
                  <SortHeader label="Vigencia" colKey="vigenciaRural" />
                  <SortHeader label="Area (km2)" colKey="area" />
                  <SortHeader label="Altitud (msnm)" colKey="altitud" />
                  <SortHeader label="Predios" colKey="totalPredios" />
                  <SortHeader label="Gestor Catastral" colKey="gestorCatastral" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700/30">
                {sortedMunicipios.map((m) => (
                  <tr
                    key={m.codigo}
                    className="hover:bg-gray-700/30 transition-colors cursor-pointer"
                    onClick={() => handleMunicipioClick(m.codigo)}
                  >
                    <td className="px-3 py-3">
                      <Link
                        href={`/municipio/${m.codigo}`}
                        className="text-sm font-medium text-white hover:text-emerald-400 transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {m.nombre}
                      </Link>
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium"
                        style={{
                          backgroundColor:
                            ESTADO_COLORS[m.estadoRural] + "20",
                          color: ESTADO_COLORS[m.estadoRural],
                          border: `1px solid ${ESTADO_COLORS[m.estadoRural]}40`,
                        }}
                      >
                        <span
                          className="w-1.5 h-1.5 rounded-full"
                          style={{
                            backgroundColor: ESTADO_COLORS[m.estadoRural],
                          }}
                        />
                        {ESTADO_LABELS[m.estadoRural]}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-sm text-gray-300 font-mono">
                      {m.vigenciaRural ?? "---"}
                    </td>
                    <td className="px-3 py-3 text-sm text-gray-300 font-mono">
                      {m.area != null
                        ? Math.round(m.area).toLocaleString()
                        : "---"}
                    </td>
                    <td className="px-3 py-3 text-sm text-gray-300 font-mono">
                      {m.altitud != null
                        ? m.altitud.toLocaleString()
                        : "---"}
                    </td>
                    <td className="px-3 py-3 text-sm text-gray-300 font-mono">
                      {m.totalPredios != null
                        ? m.totalPredios.toLocaleString()
                        : "---"}
                    </td>
                    <td className="px-3 py-3 text-sm text-gray-400">
                      {m.gestorCatastral ?? "---"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
