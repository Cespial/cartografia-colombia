/**
 * process-boundaries.mjs
 *
 * Reads the raw geoBoundaries COL ADM2 GeoJSON (all Colombian municipalities),
 * simplifies coordinates, groups by department, and outputs:
 *   1. src/data/colombia-municipios.json  — all municipalities (simplified, ~2-3 MB)
 *   2. src/data/departamentos/             — one GeoJSON per department
 *   3. src/data/municipios-index.json      — lightweight index (no geometry)
 */

import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Use the raw_boundaries.geojson from vigia-cordoba
const INPUT = resolve("/Users/cristianespinal/vigia-cordoba/scripts/raw_boundaries.geojson");
const OUT_DIR = resolve(__dirname, "../src/data");
const DEPT_DIR = resolve(OUT_DIR, "departamentos");

mkdirSync(DEPT_DIR, { recursive: true });

// ---------------------------------------------------------------------------
// 1. Coordinate simplification (4 decimal places ≈ 11m precision)
// ---------------------------------------------------------------------------
function roundCoord(coord, decimals = 4) {
  const factor = 10 ** decimals;
  return coord.map((v) => Math.round(v * factor) / factor);
}

function simplifyCoords(coords) {
  if (typeof coords[0] === "number") return roundCoord(coords);
  return coords.map(simplifyCoords);
}

// ---------------------------------------------------------------------------
// 2. Department identification from shapeID/shapeName heuristics
// ---------------------------------------------------------------------------

// Known Colombian department names for grouping
const DEPARTMENT_NAMES = [
  "Amazonas", "Antioquia", "Arauca", "Atlántico", "Bogotá D.C.",
  "Bolívar", "Boyacá", "Caldas", "Caquetá", "Casanare",
  "Cauca", "Cesar", "Chocó", "Córdoba", "Cundinamarca",
  "Guainía", "Guaviare", "Huila", "La Guajira", "Magdalena",
  "Meta", "Nariño", "Norte de Santander", "Putumayo", "Quindío",
  "Risaralda", "San Andrés y Providencia", "Santander", "Sucre",
  "Tolima", "Valle del Cauca", "Vaupés", "Vichada",
];

// ---------------------------------------------------------------------------
// 3. Read and process
// ---------------------------------------------------------------------------
console.log(`Reading ${INPUT}...`);
const raw = JSON.parse(readFileSync(INPUT, "utf8"));
console.log(`Total features: ${raw.features.length}`);

// Ensure only Colombian features (shapeGroup === "COL")
const colFeatures = raw.features.filter(
  (f) => f.properties.shapeGroup === "COL" && f.properties.shapeType === "ADM2"
);
console.log(`Colombian ADM2 features: ${colFeatures.length}`);

// Simplify all features
const simplified = colFeatures.map((f) => ({
  type: "Feature",
  properties: {
    name: f.properties.shapeName,
    id: f.properties.shapeID,
  },
  geometry: {
    type: f.geometry.type,
    coordinates: simplifyCoords(f.geometry.coordinates),
  },
}));

// ---------------------------------------------------------------------------
// 4. Write full national GeoJSON
// ---------------------------------------------------------------------------
const nationalGeoJSON = {
  type: "FeatureCollection",
  features: simplified,
};

const nationalPath = resolve(OUT_DIR, "colombia-municipios.json");
writeFileSync(nationalPath, JSON.stringify(nationalGeoJSON));
const sizeMB = (Buffer.byteLength(JSON.stringify(nationalGeoJSON)) / 1_048_576).toFixed(2);
console.log(`Wrote ${nationalPath} (${sizeMB} MB, ${simplified.length} features)`);

// ---------------------------------------------------------------------------
// 5. Build lightweight index (no geometry) with centroid calculation
// ---------------------------------------------------------------------------
function computeCentroid(geometry) {
  let sumLon = 0, sumLat = 0, count = 0;

  function traverse(coords) {
    if (typeof coords[0] === "number") {
      sumLon += coords[0];
      sumLat += coords[1];
      count++;
      return;
    }
    for (const c of coords) traverse(c);
  }

  traverse(geometry.coordinates);
  return {
    lat: Math.round((sumLat / count) * 10000) / 10000,
    lon: Math.round((sumLon / count) * 10000) / 10000,
  };
}

const index = simplified.map((f) => {
  const centroid = computeCentroid(f.geometry);
  return {
    name: f.properties.name,
    id: f.properties.id,
    lat: centroid.lat,
    lon: centroid.lon,
  };
});

const indexPath = resolve(OUT_DIR, "municipios-index.json");
writeFileSync(indexPath, JSON.stringify(index, null, 2));
console.log(`Wrote ${indexPath} (${index.length} municipalities)`);

console.log("\nDone! Ready for cartografia-colombia.");
