"use client";

import { useMemo } from "react";
import MapGL, {
  Source,
  Layer,
  NavigationControl,
} from "react-map-gl/mapbox";
import * as turf from "@turf/turf";
import "mapbox-gl/dist/mapbox-gl.css";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

interface MunicipalMapProps {
  geojson: GeoJSON.FeatureCollection | null;
  name: string;
}

export default function MunicipalMap({ geojson, name }: MunicipalMapProps) {
  const viewState = useMemo(() => {
    if (!geojson || geojson.features.length === 0) {
      return { longitude: -73.5, latitude: 4.5, zoom: 5 };
    }

    try {
      const bbox = turf.bbox(geojson);
      const center = turf.center(geojson);
      const coords = center.geometry.coordinates;

      // Estimate zoom from bbox
      const lonSpan = bbox[2] - bbox[0];
      const latSpan = bbox[3] - bbox[1];
      const maxSpan = Math.max(lonSpan, latSpan);
      const zoom = Math.max(7, Math.min(13, Math.log2(360 / maxSpan) - 1));

      return {
        longitude: coords[0],
        latitude: coords[1],
        zoom,
      };
    } catch {
      return { longitude: -73.5, latitude: 4.5, zoom: 5 };
    }
  }, [geojson]);

  if (!geojson) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-900">
        <p className="text-gray-500">
          No se encontraron límites para {name}
        </p>
      </div>
    );
  }

  return (
    <MapGL
      initialViewState={viewState}
      style={{ width: "100%", height: "100%" }}
      mapStyle="mapbox://styles/mapbox/satellite-streets-v12"
      mapboxAccessToken={MAPBOX_TOKEN}
    >
      <NavigationControl position="top-right" />

      <Source id="municipio" type="geojson" data={geojson}>
        <Layer
          id="municipio-fill"
          type="fill"
          paint={{
            "fill-color": "#22c55e",
            "fill-opacity": 0.15,
          }}
        />
        <Layer
          id="municipio-border"
          type="line"
          paint={{
            "line-color": "#22c55e",
            "line-width": 2.5,
          }}
        />
      </Source>
    </MapGL>
  );
}
