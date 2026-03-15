"use client";

import { useRef, useCallback, useState, useEffect, useMemo } from "react";
import MapGL, {
  Source,
  Layer,
  NavigationControl,
  ScaleControl,
  Popup,
} from "react-map-gl/mapbox";
import type { MapRef, MapMouseEvent } from "react-map-gl/mapbox";
import type { MunicipioIGAC, MapLayer } from "@/types";
import { ESTADO_COLORS, ESTADO_LABELS, formatCOP } from "@/lib/coverage";
import {
  Layers,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Loader2,
} from "lucide-react";
import "mapbox-gl/dist/mapbox-gl.css";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

const INITIAL_VIEW = {
  longitude: -73.5,
  latitude: 4.5,
  zoom: 5.5,
};

// --- Layer definitions with categories ---

interface SpatialLayer extends MapLayer {
  service?: string;
  layerIndex?: string;
  needsBbox?: boolean;
  lineWidth?: number;
  category: string;
}

interface LayerCategory {
  id: string;
  label: string;
}

const CATEGORIES: LayerCategory[] = [
  { id: "base", label: "Base" },
  { id: "hidrografia", label: "Hidrografía" },
  { id: "riesgo", label: "Riesgo" },
  { id: "territorio", label: "Territorio" },
  { id: "infraestructura", label: "Infraestructura" },
];

const LAYER_DEFS: SpatialLayer[] = [
  // --- Base ---
  {
    id: "municipios",
    label: "Municipios",
    description: "Municipios coloreados por estado catastral",
    visible: true,
    type: "fill",
    color: "#22c55e",
    opacity: 70,
    category: "base",
  },
  // --- Hidrografía ---
  {
    id: "hidrografia",
    label: "Red Hídrica Principal",
    description: "Red hídrica principal de Colombia",
    visible: false,
    type: "line",
    color: "#3b82f6",
    opacity: 80,
    service: "Hidrografia",
    layerIndex: "14",
    needsBbox: true,
    category: "hidrografia",
  },
  {
    id: "rios-dobles",
    label: "Ríos Dobles",
    description: "Ríos de cauce doble",
    visible: false,
    type: "line",
    color: "#60a5fa",
    opacity: 70,
    lineWidth: 2.5,
    service: "Hidrografia",
    layerIndex: "26",
    needsBbox: true,
    category: "hidrografia",
  },
  {
    id: "lagunas",
    label: "Lagunas",
    description: "Cuerpos de agua lénticos",
    visible: false,
    type: "fill",
    color: "#2563eb",
    opacity: 50,
    service: "Hidrografia",
    layerIndex: "18",
    needsBbox: true,
    category: "hidrografia",
  },
  {
    id: "humedales",
    label: "Humedales",
    description: "Zonas de humedales",
    visible: false,
    type: "fill",
    color: "#06b6d4",
    opacity: 40,
    service: "Hidrografia",
    layerIndex: "38",
    needsBbox: true,
    category: "hidrografia",
  },
  // --- Riesgo ---
  {
    id: "amenaza-sismica",
    label: "Amenaza Sísmica",
    description: "Zonificación de amenaza sísmica nacional",
    visible: false,
    type: "fill",
    color: "#ef4444",
    opacity: 40,
    service: "AmenazaSismica1_WFL1",
    layerIndex: "0",
    category: "riesgo",
  },
  {
    id: "deslizamientos",
    label: "Movimientos en Masa",
    description: "Amenaza por deslizamientos y movimiento en masa",
    visible: false,
    type: "fill",
    color: "#f97316",
    opacity: 40,
    service: "Movimiento_masa_WFL1",
    layerIndex: "0",
    category: "riesgo",
  },
  {
    id: "incendios-forestales",
    label: "Incendios Forestales",
    description: "Amenaza por incendios forestales",
    visible: false,
    type: "fill",
    color: "#dc2626",
    opacity: 35,
    service: "IncendiosForestales_WFL1",
    layerIndex: "0",
    category: "riesgo",
  },
  // --- Territorio ---
  {
    id: "resguardos",
    label: "Resguardos Indígenas",
    description: "Territorios de resguardos indígenas reconocidos",
    visible: false,
    type: "fill",
    color: "#a855f7",
    opacity: 20,
    service: "Resguardos_Indigenas",
    layerIndex: "0",
    category: "territorio",
  },
  {
    id: "coberturas-tierra",
    label: "Coberturas de la Tierra",
    description: "Clasificación de coberturas terrestres",
    visible: false,
    type: "fill",
    color: "#84cc16",
    opacity: 35,
    service: "Coberturas_de_la_tierra_WFL1",
    layerIndex: "0",
    needsBbox: true,
    category: "territorio",
  },
  {
    id: "capacidad-uso",
    label: "Capacidad de Uso",
    description: "Capacidad de uso de la tierra",
    visible: false,
    type: "fill",
    color: "#a3e635",
    opacity: 35,
    service: "capacidadusodelatierra",
    layerIndex: "0",
    needsBbox: true,
    category: "territorio",
  },
  {
    id: "frontera-agricola",
    label: "Frontera Agrícola",
    description: "Delimitación de la frontera agrícola nacional",
    visible: false,
    type: "fill",
    color: "#eab308",
    opacity: 30,
    service: "Frontera_Agricola",
    layerIndex: "0",
    category: "territorio",
  },
  {
    id: "curvas-nivel",
    label: "Curvas de Nivel",
    description: "Curvas de nivel topográficas (25k)",
    visible: false,
    type: "line",
    color: "#a8a29e",
    opacity: 50,
    lineWidth: 0.5,
    service: "carto25000curvasdenivel",
    layerIndex: "0",
    needsBbox: true,
    category: "territorio",
  },
  // --- Infraestructura ---
  {
    id: "red-vial",
    label: "Red Vial",
    description: "Infraestructura vial nacional",
    visible: false,
    type: "line",
    color: "#ffffff",
    opacity: 60,
    service: "Infraestructura_V2",
    layerIndex: "0",
    category: "infraestructura",
  },
];

// --- Popup ---

interface PopupInfo {
  longitude: number;
  latitude: number;
  name: string;
  departamento: string;
  estado: string;
  predios: string;
  avaluo: string;
  codigo: string;
}

// --- Component ---

export default function ExploradorContent() {
  const mapRef = useRef<MapRef>(null);

  // Layer state
  const [layers, setLayers] = useState<SpatialLayer[]>(LAYER_DEFS);
  const [layerData, setLayerData] = useState<
    Record<string, GeoJSON.FeatureCollection | null>
  >({});
  const [layerLoading, setLayerLoading] = useState<Record<string, boolean>>({});

  // Municipality data
  const [municipiosGeoJSON, setMunicipiosGeoJSON] =
    useState<GeoJSON.FeatureCollection | null>(null);
  const [igacData, setIgacData] = useState<MunicipioIGAC[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  // UI state
  const [panelOpen, setPanelOpen] = useState(true);
  const [popup, setPopup] = useState<PopupInfo | null>(null);
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});

  // --- Load base data ---
  useEffect(() => {
    async function loadBase() {
      try {
        const [geoRes, igacRes] = await Promise.all([
          fetch("/data/colombia-municipios.json"),
          fetch("/api/municipios"),
        ]);
        const geoData = await geoRes.json();
        setMunicipiosGeoJSON(geoData);

        const igacMunicipios: MunicipioIGAC[] = await igacRes.json();
        setIgacData(igacMunicipios);
      } catch (err) {
        console.error("Error loading base data:", err);
      } finally {
        setDataLoading(false);
      }
    }
    loadBase();
  }, []);

  // --- Enrich GeoJSON ---
  const enrichedGeoJSON = useMemo(() => {
    if (!municipiosGeoJSON || igacData.length === 0) return null;

    const igacMap = new Map(
      igacData.map((m) => [m.nombre.toUpperCase(), m])
    );

    return {
      type: "FeatureCollection" as const,
      features: municipiosGeoJSON.features.map((f) => {
        const name = String(f.properties?.name ?? "").toUpperCase();
        const match = igacMap.get(name);
        return {
          ...f,
          properties: {
            ...f.properties,
            estado: match?.estadoRural ?? "DESACTUALIZADO",
            departamento: match?.departamento ?? "",
            codigo: match?.codigo ?? "",
            totalPredios: match?.totalPredios ?? 0,
            avaluoRural: match?.avaluoRural ?? 0,
            avaluoUrbano: match?.avaluoUrbano ?? 0,
            vigencia: match?.vigenciaRural ?? null,
          },
        };
      }),
    } as GeoJSON.FeatureCollection;
  }, [municipiosGeoJSON, igacData]);

  // --- Fetch spatial layer data on toggle ---
  const fetchLayerData = useCallback(async (layer: SpatialLayer) => {
    if (!layer.service) return;

    setLayerLoading((prev) => ({ ...prev, [layer.id]: true }));
    try {
      let url = `/api/igac/layers?service=${layer.service}&layer=${layer.layerIndex ?? "0"}`;
      if (layer.needsBbox) {
        url += "&bbox=-82,0,-66,14";
      }
      const res = await fetch(url);
      const data = await res.json();
      setLayerData((prev) => ({ ...prev, [layer.id]: data }));
    } catch (err) {
      console.error(`Error fetching layer ${layer.id}:`, err);
    } finally {
      setLayerLoading((prev) => ({ ...prev, [layer.id]: false }));
    }
  }, []);

  // --- Toggle layer visibility ---
  const toggleLayer = useCallback(
    (layerId: string) => {
      setLayers((prev) =>
        prev.map((l) => {
          if (l.id !== layerId) return l;
          const nextVisible = !l.visible;

          // Lazy fetch: load data on first activation
          if (nextVisible && l.service && !layerData[l.id]) {
            fetchLayerData(l);
          }

          return { ...l, visible: nextVisible };
        })
      );
    },
    [layerData, fetchLayerData]
  );

  // --- Update layer opacity ---
  const setLayerOpacity = useCallback((layerId: string, opacity: number) => {
    setLayers((prev) =>
      prev.map((l) => (l.id === layerId ? { ...l, opacity } : l))
    );
  }, []);

  // --- Toggle category collapse ---
  const toggleCategory = useCallback((categoryId: string) => {
    setCollapsedCategories((prev) => ({
      ...prev,
      [categoryId]: !prev[categoryId],
    }));
  }, []);

  // --- Map click for municipality popup ---
  const onMapClick = useCallback((event: MapMouseEvent) => {
    const feature = event.features?.[0];
    if (!feature || !event.lngLat) {
      setPopup(null);
      return;
    }

    const props = feature.properties ?? {};
    const avaluoTotal =
      (Number(props.avaluoRural) || 0) + (Number(props.avaluoUrbano) || 0);

    setPopup({
      longitude: event.lngLat.lng,
      latitude: event.lngLat.lat,
      name: String(props.name ?? ""),
      departamento: String(props.departamento ?? ""),
      estado: String(props.estado ?? ""),
      predios: Number(props.totalPredios)
        ? Number(props.totalPredios).toLocaleString()
        : "N/D",
      avaluo: avaluoTotal > 0 ? formatCOP(avaluoTotal) : "N/D",
      codigo: String(props.codigo ?? ""),
    });
  }, []);

  // --- Get opacity for a layer ---
  const getOpacity = (layerId: string): number => {
    const layer = layers.find((l) => l.id === layerId);
    return (layer?.opacity ?? 70) / 100;
  };

  // --- Municipality layer visible? ---
  const municipiosVisible = layers.find((l) => l.id === "municipios")?.visible ?? true;

  // --- Layers grouped by category ---
  const layersByCategory = useMemo(() => {
    const grouped: Record<string, SpatialLayer[]> = {};
    for (const cat of CATEGORIES) {
      grouped[cat.id] = layers.filter((l) => l.category === cat.id);
    }
    return grouped;
  }, [layers]);

  // --- Visible non-municipio layers for generic rendering ---
  const visibleSpatialLayers = layers.filter(
    (l) => l.visible && l.id !== "municipios" && l.id !== "amenaza-sismica" && layerData[l.id]
  );

  return (
    <div className="w-screen h-screen relative overflow-hidden">
      {/* Fullscreen Map */}
      <MapGL
        ref={mapRef}
        initialViewState={INITIAL_VIEW}
        style={{ width: "100%", height: "100%" }}
        mapStyle="mapbox://styles/mapbox/dark-v11"
        mapboxAccessToken={MAPBOX_TOKEN}
        interactiveLayerIds={municipiosVisible ? ["municipios-fill"] : []}
        onClick={onMapClick}
        cursor="pointer"
      >
        <NavigationControl position="top-right" />
        <ScaleControl position="bottom-left" />

        {/* === Municipios layer (always loaded) === */}
        {enrichedGeoJSON && municipiosVisible && (
          <Source id="municipios" type="geojson" data={enrichedGeoJSON}>
            <Layer
              id="municipios-fill"
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
                "fill-opacity": getOpacity("municipios"),
              }}
            />
            <Layer
              id="municipios-border"
              type="line"
              paint={{
                "line-color": "#1f2937",
                "line-width": 0.5,
              }}
            />
          </Source>
        )}

        {/* === Amenaza Sísmica (special interpolated paint) === */}
        {layers.find((l) => l.id === "amenaza-sismica")?.visible &&
          layerData["amenaza-sismica"] && (
            <Source
              id="amenaza-sismica"
              type="geojson"
              data={layerData["amenaza-sismica"]}
            >
              <Layer
                id="amenaza-sismica-fill"
                type="fill"
                paint={{
                  "fill-color": [
                    "interpolate",
                    ["linear"],
                    ["coalesce", ["to-number", ["get", "OBJECTID"], 0], 0],
                    0,
                    "#fef08a",
                    50,
                    "#f97316",
                    100,
                    "#ef4444",
                  ],
                  "fill-opacity": getOpacity("amenaza-sismica"),
                }}
              />
              <Layer
                id="amenaza-sismica-border"
                type="line"
                paint={{
                  "line-color": "#ef4444",
                  "line-width": 0.5,
                  "line-opacity": 0.5,
                }}
              />
            </Source>
          )}

        {/* === Generic renderer for all other spatial layers === */}
        {visibleSpatialLayers.map((layer) => (
          <Source
            key={layer.id}
            id={layer.id}
            type="geojson"
            data={layerData[layer.id]!}
          >
            {layer.type === "fill" ? (
              <>
                <Layer
                  id={`${layer.id}-fill`}
                  type="fill"
                  paint={{
                    "fill-color": layer.color!,
                    "fill-opacity": getOpacity(layer.id),
                  }}
                />
                <Layer
                  id={`${layer.id}-border`}
                  type="line"
                  paint={{
                    "line-color": layer.color!,
                    "line-width": 1,
                    "line-opacity": 0.5,
                  }}
                />
              </>
            ) : (
              <Layer
                id={`${layer.id}-line`}
                type="line"
                paint={{
                  "line-color": layer.color!,
                  "line-width": layer.lineWidth ?? 1.5,
                  "line-opacity": getOpacity(layer.id),
                }}
              />
            )}
          </Source>
        ))}

        {/* === Popup === */}
        {popup && (
          <Popup
            longitude={popup.longitude}
            latitude={popup.latitude}
            closeButton={true}
            closeOnClick={false}
            onClose={() => setPopup(null)}
            anchor="bottom"
            className="!p-0"
            maxWidth="320px"
          >
            <div className="bg-gray-900 text-white p-4 rounded-lg text-sm min-w-[260px]">
              <p className="font-bold text-base leading-tight">{popup.name}</p>
              <p className="text-gray-400 text-xs mt-0.5">
                {popup.departamento}
              </p>

              <div className="mt-3 space-y-2">
                <div className="flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-full inline-block flex-shrink-0"
                    style={{
                      backgroundColor:
                        ESTADO_COLORS[
                          popup.estado as keyof typeof ESTADO_COLORS
                        ] ?? "#6b7280",
                    }}
                  />
                  <span className="text-sm">
                    {ESTADO_LABELS[
                      popup.estado as keyof typeof ESTADO_LABELS
                    ] ?? popup.estado}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-gray-700">
                  <div>
                    <p className="text-gray-500 text-xs">Predios</p>
                    <p className="font-semibold">{popup.predios}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs">Avaluo</p>
                    <p className="font-semibold">{popup.avaluo}</p>
                  </div>
                </div>
              </div>

              {popup.codigo && (
                <a
                  href={`/municipio/${popup.codigo}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 block text-center text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
                >
                  Ver detalle completo &rarr;
                </a>
              )}
            </div>
          </Popup>
        )}
      </MapGL>

      {/* === Loading overlay === */}
      {dataLoading && (
        <div className="absolute inset-0 bg-gray-950/80 flex items-center justify-center z-30 pointer-events-none">
          <div className="text-center">
            <div className="w-10 h-10 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-400 text-sm">
              Cargando datos de municipios...
            </p>
          </div>
        </div>
      )}

      {/* === Layer control panel with collapsible categories === */}
      <div className="absolute top-4 left-4 z-20 w-80 max-h-[calc(100vh-2rem)] flex flex-col">
        {/* Panel header */}
        <button
          onClick={() => setPanelOpen(!panelOpen)}
          className="w-full flex items-center justify-between gap-2 px-4 py-3 bg-gray-900/95 backdrop-blur-md border border-gray-700 rounded-xl shadow-2xl hover:border-gray-600 transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <Layers className="w-5 h-5 text-emerald-400" />
            <span className="font-semibold text-sm text-white">
              Capas del mapa
            </span>
            <span className="text-xs text-gray-500">
              ({layers.filter((l) => l.visible).length}/{layers.length})
            </span>
          </div>
          {panelOpen ? (
            <ChevronUp className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          )}
        </button>

        {/* Panel body */}
        {panelOpen && (
          <div className="mt-2 bg-gray-900/95 backdrop-blur-md border border-gray-700 rounded-xl shadow-2xl overflow-y-auto">
            {CATEGORIES.map((cat) => {
              const catLayers = layersByCategory[cat.id] ?? [];
              if (catLayers.length === 0) return null;
              const isCollapsed = collapsedCategories[cat.id] ?? false;
              const visibleCount = catLayers.filter((l) => l.visible).length;

              return (
                <div key={cat.id} className="border-b border-gray-800 last:border-b-0">
                  {/* Category header */}
                  <button
                    onClick={() => toggleCategory(cat.id)}
                    className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-gray-800/50 transition-colors"
                  >
                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      {cat.label}
                    </span>
                    <div className="flex items-center gap-2">
                      {visibleCount > 0 && (
                        <span className="text-xs text-emerald-400">{visibleCount}</span>
                      )}
                      {isCollapsed ? (
                        <ChevronDown className="w-3.5 h-3.5 text-gray-500" />
                      ) : (
                        <ChevronUp className="w-3.5 h-3.5 text-gray-500" />
                      )}
                    </div>
                  </button>

                  {/* Category layers */}
                  {!isCollapsed && (
                    <div className="divide-y divide-gray-800/50">
                      {catLayers.map((layer) => {
                        const isLoading = layerLoading[layer.id] ?? false;

                        return (
                          <div key={layer.id} className="px-4 py-2.5">
                            {/* Row: toggle + label + eye icon */}
                            <div className="flex items-center gap-3">
                              <label className="relative flex items-center cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={layer.visible}
                                  onChange={() => toggleLayer(layer.id)}
                                  disabled={layer.id === "municipios"}
                                  className="sr-only peer"
                                />
                                <div
                                  className={`w-9 h-5 rounded-full transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-emerald-400/50 ${
                                    layer.visible
                                      ? "bg-emerald-500"
                                      : "bg-gray-700"
                                  } ${layer.id === "municipios" ? "opacity-70" : ""}`}
                                >
                                  <div
                                    className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform mt-0.5 ${
                                      layer.visible
                                        ? "translate-x-[18px]"
                                        : "translate-x-0.5"
                                    }`}
                                  />
                                </div>
                              </label>

                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span
                                    className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                                    style={{ backgroundColor: layer.color }}
                                  />
                                  <span className="text-sm font-medium text-white truncate">
                                    {layer.label}
                                  </span>
                                </div>
                                <p className="text-xs text-gray-500 mt-0.5 leading-tight">
                                  {layer.description}
                                </p>
                              </div>

                              <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
                                {isLoading ? (
                                  <Loader2 className="w-4 h-4 text-emerald-400 animate-spin" />
                                ) : layer.visible ? (
                                  <Eye className="w-4 h-4 text-emerald-400" />
                                ) : (
                                  <EyeOff className="w-4 h-4 text-gray-600" />
                                )}
                              </div>
                            </div>

                            {/* Opacity slider — shown when layer is visible */}
                            {layer.visible && (
                              <div className="mt-2 flex items-center gap-3 pl-12">
                                <span className="text-xs text-gray-500 w-14 flex-shrink-0">
                                  Opacidad
                                </span>
                                <input
                                  type="range"
                                  min={0}
                                  max={100}
                                  value={layer.opacity ?? 70}
                                  onChange={(e) =>
                                    setLayerOpacity(
                                      layer.id,
                                      parseInt(e.target.value, 10)
                                    )
                                  }
                                  className="flex-1 h-1 bg-gray-700 rounded-full appearance-none cursor-pointer accent-emerald-400 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-emerald-400 [&::-webkit-slider-thumb]:shadow-md"
                                />
                                <span className="text-xs text-gray-400 w-8 text-right tabular-nums">
                                  {layer.opacity ?? 70}%
                                </span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Legend for municipios */}
            {municipiosVisible && (
              <div className="px-4 py-3 border-t border-gray-700 bg-gray-950/50">
                <p className="text-xs text-gray-500 mb-2 font-medium uppercase tracking-wide">
                  Estado catastral
                </p>
                <div className="grid grid-cols-2 gap-1.5">
                  {(
                    Object.entries(ESTADO_COLORS) as [string, string][]
                  ).map(([key, color]) => (
                    <div key={key} className="flex items-center gap-1.5">
                      <span
                        className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                        style={{ backgroundColor: color }}
                      />
                      <span className="text-xs text-gray-400">
                        {ESTADO_LABELS[key as keyof typeof ESTADO_LABELS] ??
                          key}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
