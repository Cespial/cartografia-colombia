// === Municipality & Cadastral Status ===

export type EstadoCatastral =
  | "ACTUALIZADO"
  | "ACTUALIZADO PARCIAL"
  | "DESACTUALIZADO"
  | "POR FORMAR";

export interface MunicipioIndex {
  name: string;
  id: string;
  lat: number;
  lon: number;
}

export interface MunicipioIGAC {
  codigo: string;
  nombre: string;
  departamento: string;
  estadoRural: EstadoCatastral;
  estadoUrbano: EstadoCatastral;
  vigenciaRural: number | null;
  vigenciaUrbana: number | null;
  area: number | null;
  altitud: number | null;
}

export interface MunicipioDetalle extends MunicipioIGAC {
  lat: number;
  lon: number;
  geojsonId?: string;
}

// === Map Layers ===

export interface MapLayer {
  id: string;
  label: string;
  description: string;
  visible: boolean;
  type: "fill" | "line" | "circle" | "raster";
  color?: string;
}

// === Coverage Analysis ===

export interface CoverageStats {
  total: number;
  actualizado: number;
  actualizadoParcial: number;
  desactualizado: number;
  porFormar: number;
}

export interface DepartmentCoverage {
  departamento: string;
  stats: CoverageStats;
  porcentajeActualizado: number;
}

// === GeoJSON helpers ===

export interface GeoJSONFeature {
  type: "Feature";
  properties: Record<string, unknown>;
  geometry: {
    type: string;
    coordinates: unknown;
  };
}

export interface GeoJSONCollection {
  type: "FeatureCollection";
  features: GeoJSONFeature[];
}
