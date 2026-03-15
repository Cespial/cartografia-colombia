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

/** Full IGAC municipality data — expanded from 9 to 30+ fields */
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
  // Predios
  prediosRurales: number | null;
  prediosUrbanos: number | null;
  totalPredios: number | null;
  // Avalúos
  avaluoRural: number | null;
  avaluoUrbano: number | null;
  // Áreas geográficas
  areaRuralHa: number | null;
  areaUrbanaHa: number | null;
  areaTotalHa: number | null;
  // Clasificación
  gestorCatastral: string | null;
  pdet: string | null;
  ley617: string | null;
  categoriaMunicipal: string | null;
  // Programación de actualización
  anoProgramado: number | null;
  metaFecha: string | null;
  valorActualizacion: number | null;
  zonaIntervencion: string | null;
}

export interface MunicipioDetalle extends MunicipioIGAC {
  lat: number;
  lon: number;
  geojsonId?: string;
}

// === Enrichment data from datos.gov.co ===

export interface EducacionMunicipio {
  codigoMunicipio: string;
  anio: number;
  matriculaTotal: number | null;
  coberturaNetaTransicion: number | null;
  coberturaNetaPrimaria: number | null;
  coberturaNetaSecundaria: number | null;
  coberturaNetaMedia: number | null;
  desercionTransicion: number | null;
  desercionPrimaria: number | null;
  desercionSecundaria: number | null;
  desercionMedia: number | null;
  aprobacionPrimaria: number | null;
  aprobacionSecundaria: number | null;
  aprobacionMedia: number | null;
}

export interface SaludIPS {
  nombre: string;
  nivel: string;
  caracter: string;
  departamento: string;
  municipio: string;
  direccion: string;
  habilitado: string;
}

export interface HomicidioStats {
  codigoMunicipio: string;
  anio: number;
  cantidad: number;
}

export interface AgriculturaEVA {
  codigoMunicipio: string;
  cultivo: string;
  areaSembrada: number | null;
  areaCosechada: number | null;
  produccion: number | null;
  rendimiento: number | null;
  anio: number;
}

export interface CoberturaTelco {
  codigoMunicipio: string;
  proveedor: string;
  tecnologia2G: boolean;
  tecnologia3G: boolean;
  tecnologia4G: boolean;
  tecnologiaLTE: boolean;
  tecnologia5G: boolean;
}

export interface EmergenciaUNGRD {
  fecha: string;
  departamento: string;
  municipio: string;
  evento: string;
  fallecidos: number;
  heridos: number;
  personasAfectadas: number;
  familiasAfectadas: number;
  viviendasAfectadas: number;
  viviendasDestruidas: number;
}

export interface DesempenoMunicipal {
  codigoEntidad: string;
  entidad: string;
  departamento: string;
  indicador: string;
  dato: number | null;
  anio: number;
}

export interface ContratoSECOP {
  procesoCompra: string;
  nombreEntidad: string;
  departamento: string;
  ciudad: string;
  valorContrato: number | null;
  objetoContratar: string;
  fechaFirma: string;
}

export interface TurismoRNT {
  codigoRnt: string;
  departamento: string;
  municipio: string;
  categoria: string;
  subcategoria: string;
  habitaciones: number | null;
  camas: number | null;
}

export interface ProduccionMinera {
  municipio: string;
  departamento: string;
  mineral: string;
  volumen: number | null;
  unidad: string;
  regalias: number | null;
  anio: number;
}

// === Map Layers ===

export interface MapLayer {
  id: string;
  label: string;
  description: string;
  visible: boolean;
  type: "fill" | "line" | "circle" | "raster";
  color?: string;
  opacity?: number;
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
  totalPredios: number;
  avaluoTotal: number;
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

// === Enrichment summary for municipality detail ===

export interface MunicipioEnriched {
  igac: MunicipioIGAC;
  educacion: EducacionMunicipio | null;
  salud: { total: number; porNivel: Record<string, number> };
  seguridad: { homicidios: number; tasa: number; anio: number } | null;
  agricultura: AgriculturaEVA[];
  telecomunicaciones: CoberturaTelco[];
  emergencias: EmergenciaUNGRD[];
  turismo: { prestadores: number; habitaciones: number; camas: number };
  desempeno: DesempenoMunicipal[];
}
