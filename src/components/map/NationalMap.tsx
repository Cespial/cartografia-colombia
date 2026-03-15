"use client";

import { useRef, useCallback, useState, useEffect } from "react";
import MapGL, { Source, Layer, NavigationControl, Popup } from "react-map-gl/mapbox";
import type { MapRef, MapMouseEvent } from "react-map-gl/mapbox";
import type { MunicipioIGAC } from "@/types";
import { ESTADO_COLORS, ESTADO_LABELS } from "@/lib/coverage";
import "mapbox-gl/dist/mapbox-gl.css";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

// Colombia center
const INITIAL_VIEW = {
  longitude: -73.5,
  latitude: 4.5,
  zoom: 5.5,
};

interface PopupInfo {
  longitude: number;
  latitude: number;
  name: string;
  estado: string;
  departamento: string;
  codigo: string;
}

interface NationalMapProps {
  municipiosGeoJSON: GeoJSON.FeatureCollection | null;
  igacData: MunicipioIGAC[];
  onMunicipioClick?: (codigo: string) => void;
}

export default function NationalMap({
  municipiosGeoJSON,
  igacData,
  onMunicipioClick,
}: NationalMapProps) {
  const mapRef = useRef<MapRef>(null);
  const [popup, setPopup] = useState<PopupInfo | null>(null);
  const [enrichedGeoJSON, setEnrichedGeoJSON] =
    useState<GeoJSON.FeatureCollection | null>(null);

  // Enrich GeoJSON with IGAC cadastral status
  useEffect(() => {
    if (!municipiosGeoJSON || igacData.length === 0) return;

    const igacMap = new Map(
      igacData.map((m) => [m.nombre.toUpperCase(), m])
    );

    const enriched: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
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
            vigencia: match?.vigenciaRural ?? null,
          },
        };
      }),
    };

    setEnrichedGeoJSON(enriched);
  }, [municipiosGeoJSON, igacData]);

  const onHover = useCallback((event: MapMouseEvent) => {
    const feature = event.features?.[0];
    if (feature && event.lngLat) {
      setPopup({
        longitude: event.lngLat.lng,
        latitude: event.lngLat.lat,
        name: String(feature.properties?.name ?? ""),
        estado: String(feature.properties?.estado ?? ""),
        departamento: String(feature.properties?.departamento ?? ""),
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

  return (
    <MapGL
      ref={mapRef}
      initialViewState={INITIAL_VIEW}
      style={{ width: "100%", height: "100%" }}
      mapStyle="mapbox://styles/mapbox/dark-v11"
      mapboxAccessToken={MAPBOX_TOKEN}
      interactiveLayerIds={["municipios-fill"]}
      onMouseMove={onHover}
      onMouseLeave={() => setPopup(null)}
      onClick={onClick}
      cursor="pointer"
    >
      <NavigationControl position="top-right" />

      {enrichedGeoJSON && (
        <Source id="municipios" type="geojson" data={enrichedGeoJSON}>
          <Layer
            id="municipios-fill"
            type="fill"
            paint={{
              "fill-color": [
                "match",
                ["get", "estado"],
                "ACTUALIZADO", ESTADO_COLORS.ACTUALIZADO,
                "ACTUALIZADO PARCIAL", ESTADO_COLORS["ACTUALIZADO PARCIAL"],
                "DESACTUALIZADO", ESTADO_COLORS.DESACTUALIZADO,
                "POR FORMAR", ESTADO_COLORS["POR FORMAR"],
                "#6b7280", // fallback gray
              ],
              "fill-opacity": 0.7,
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

      {popup && (
        <Popup
          longitude={popup.longitude}
          latitude={popup.latitude}
          closeButton={false}
          closeOnClick={false}
          anchor="bottom"
          className="!p-0"
        >
          <div className="bg-gray-900 text-white p-3 rounded-lg text-sm min-w-[200px]">
            <p className="font-bold text-base">{popup.name}</p>
            <p className="text-gray-400">{popup.departamento}</p>
            <div className="mt-2 flex items-center gap-2">
              <span
                className="w-3 h-3 rounded-full inline-block"
                style={{
                  backgroundColor:
                    ESTADO_COLORS[popup.estado as keyof typeof ESTADO_COLORS] ??
                    "#6b7280",
                }}
              />
              <span>
                {ESTADO_LABELS[popup.estado as keyof typeof ESTADO_LABELS] ??
                  popup.estado}
              </span>
            </div>
            {popup.codigo && (
              <p className="text-gray-500 text-xs mt-1">Código: {popup.codigo}</p>
            )}
          </div>
        </Popup>
      )}
    </MapGL>
  );
}
