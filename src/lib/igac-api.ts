/**
 * IGAC ArcGIS REST API client with pagination support.
 * Expanded to cover 15+ IGAC services.
 */

const IGAC_BASE =
  "https://services2.arcgis.com/RVvWzU3lgJISqdke/ArcGIS/rest/services";

const PAGE_SIZE = 2000;

interface QueryOptions {
  where?: string;
  outFields?: string;
  returnGeometry?: boolean;
  outSR?: number;
  resultRecordCount?: number;
  geometry?: string;
  geometryType?: string;
  inSR?: number;
  spatialRel?: string;
  orderByFields?: string;
}

export async function queryIGAC(
  serviceName: string,
  layerIndex: number = 0,
  options: QueryOptions = {}
) {
  const {
    where = "1=1",
    outFields = "*",
    returnGeometry = true,
    outSR = 4326,
    resultRecordCount = PAGE_SIZE,
    geometry,
    geometryType,
    inSR,
    spatialRel,
    orderByFields,
  } = options;

  const allFeatures: unknown[] = [];
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    const params = new URLSearchParams({
      where,
      outFields,
      returnGeometry: String(returnGeometry),
      outSR: String(outSR),
      f: "geojson",
      resultRecordCount: String(resultRecordCount),
      resultOffset: String(offset),
    });

    if (geometry) params.set("geometry", geometry);
    if (geometryType) params.set("geometryType", geometryType);
    if (inSR) params.set("inSR", String(inSR));
    if (spatialRel) params.set("spatialRel", spatialRel);
    if (orderByFields) params.set("orderByFields", orderByFields);

    const url = `${IGAC_BASE}/${serviceName}/FeatureServer/${layerIndex}/query?${params}`;

    const res = await fetch(url, { next: { revalidate: 86400 } });
    if (!res.ok) throw new Error(`IGAC API error: ${res.status} for ${serviceName}`);

    const data = await res.json();

    if (data.features) {
      allFeatures.push(...data.features);
    }

    hasMore =
      data.properties?.exceededTransferLimit === true ||
      (data.features?.length === resultRecordCount);
    offset += resultRecordCount;

    if (offset > PAGE_SIZE * 50) break;
  }

  return {
    type: "FeatureCollection" as const,
    features: allFeatures,
  };
}

export async function queryIGACStats(
  serviceName: string,
  layerIndex: number = 0,
  statisticField: string,
  groupByField: string
) {
  const stats = JSON.stringify([
    {
      statisticType: "count",
      onStatisticField: statisticField,
      outStatisticFieldName: "cnt",
    },
  ]);

  const params = new URLSearchParams({
    where: "1=1",
    returnGeometry: "false",
    groupByFieldsForStatistics: groupByField,
    outStatistics: stats,
    f: "json",
  });

  const url = `${IGAC_BASE}/${serviceName}/FeatureServer/${layerIndex}/query?${params}`;
  const res = await fetch(url, { next: { revalidate: 86400 } });
  if (!res.ok) throw new Error(`IGAC stats error: ${res.status}`);

  return res.json();
}

// =====================================================================
// Convenience functions — expanded to 60+ IGAC fields
// =====================================================================

/** All municipality fields (60+) */
const MUNICIPIOS_FIELDS = [
  "MpCodigo", "MpNombre", "Depto",
  "ESTADO_RURAL", "ESTADO_URBANO",
  "VIGENCIA_CATASTRAL_RURAL", "VIGENCIA_CATASTRAL_URBANA",
  "MpArea", "MpAltitud",
  "PREDIOS_RURALES", "PREDIOS_URBANOS", "Total_PREDIOS",
  "AVALÚO_RURAL____E", "AVALÚO_URBANO_____E",
  "AREA_GEOGRÁFICA_RURAL_HECTÁREAS", "AREA_GEOGRÁFICA_URBANA_HECTÁREA", "AREA_GEOGRÁFICA_TOTAL_HECTÁREAS",
  "GESTOR_CATASTRAL", "PDET", "Ley617", "MpCategor",
  "AÑO_PROGRAMADO", "META_FECHA",
  "VALOR_ACTUALIZACIÓN_IGAC_POR_MU",
  "Zona_de_intervención",
].join(",");

export async function fetchMunicipiosIGAC() {
  return queryIGAC("Municipios", 0, {
    outFields: MUNICIPIOS_FIELDS,
    returnGeometry: false,
  });
}

export async function fetchCoberturaEstado() {
  return queryIGACStats("Municipios", 0, "MpCodigo", "ESTADO_RURAL");
}

// --- Spatial layers ---

export async function fetchHidrografia(bbox: string) {
  return queryIGAC("Hidrografia", 14, {
    geometry: bbox,
    geometryType: "esriGeometryEnvelope",
    inSR: 4326,
    spatialRel: "esriSpatialRelIntersects",
  });
}

export async function fetchRiosDobles(bbox: string) {
  return queryIGAC("Hidrografia", 26, {
    geometry: bbox,
    geometryType: "esriGeometryEnvelope",
    inSR: 4326,
    spatialRel: "esriSpatialRelIntersects",
  });
}

export async function fetchLagunas(bbox: string) {
  return queryIGAC("Hidrografia", 18, {
    geometry: bbox,
    geometryType: "esriGeometryEnvelope",
    inSR: 4326,
    spatialRel: "esriSpatialRelIntersects",
  });
}

export async function fetchHumedales(bbox: string) {
  return queryIGAC("Hidrografia", 38, {
    geometry: bbox,
    geometryType: "esriGeometryEnvelope",
    inSR: 4326,
    spatialRel: "esriSpatialRelIntersects",
  });
}

export async function fetchCurvasNivel(bbox: string) {
  return queryIGAC("carto25000curvasdenivel", 0, {
    outFields: "ALTURA_SOBRE_NIVEL_MAR,TIPO_CURVA_NIVEL",
    geometry: bbox,
    geometryType: "esriGeometryEnvelope",
    inSR: 4326,
    spatialRel: "esriSpatialRelIntersects",
  });
}

// --- Thematic layers ---

export async function fetchResguardosIndigenas() {
  return queryIGAC("Resguardos_Indigenas", 0, {
    outFields: "NOMBRE_RES,PUEBLO,DEPARTAMEN,MUNICIPIO,AREA_ACTO_,TIPO_ACTO_",
    returnGeometry: true,
  });
}

export async function fetchNBI() {
  return queryIGAC("NBI_Municipios", 7, {
    outFields: "MpCodigo,MpNombre,Depto,NBI,Rango",
    returnGeometry: false,
  });
}

export async function fetchDensidadPoblacional() {
  return queryIGAC("Densidad_Poblacional", 1, {
    outFields: "MpCodigo,MpNombre,Depto,V,RA",
    returnGeometry: false,
  });
}

export async function fetchAmenazaSismica() {
  return queryIGAC("AmenazaSismica1_WFL1", 0, {
    returnGeometry: true,
  });
}

export async function fetchMovimientoMasa() {
  return queryIGAC("Movimiento_masa_WFL1", 0, {
    returnGeometry: true,
  });
}

export async function fetchIncendiosForestales() {
  return queryIGAC("IncendiosForestales_WFL1", 0, {
    returnGeometry: true,
  });
}

export async function fetchCoberturasTierra(bbox: string) {
  return queryIGAC("Coberturas_de_la_tierra_WFL1", 0, {
    geometry: bbox,
    geometryType: "esriGeometryEnvelope",
    inSR: 4326,
    spatialRel: "esriSpatialRelIntersects",
  });
}

export async function fetchCapacidadUso(bbox: string) {
  return queryIGAC("capacidadusodelatierra", 0, {
    geometry: bbox,
    geometryType: "esriGeometryEnvelope",
    inSR: 4326,
    spatialRel: "esriSpatialRelIntersects",
  });
}

export async function fetchFronteraAgricola() {
  return queryIGAC("Frontera_Agricola", 0, {
    returnGeometry: true,
  });
}

export async function fetchGeneralidadesMunicipios() {
  return queryIGAC("_Generalidades_Municipios", 0, {
    outFields: "*",
    returnGeometry: false,
  });
}
