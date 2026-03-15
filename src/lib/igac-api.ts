/**
 * IGAC ArcGIS REST API client with pagination support.
 *
 * Base URL: https://services2.arcgis.com/RVvWzU3lgJISqdke/ArcGIS/rest/services
 * Max 2,000 features per request — this client auto-paginates.
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

    // Check if there are more results
    hasMore =
      data.properties?.exceededTransferLimit === true ||
      (data.features?.length === resultRecordCount);
    offset += resultRecordCount;

    // Safety: don't paginate more than 50 pages (100k features)
    if (offset > PAGE_SIZE * 50) break;
  }

  return {
    type: "FeatureCollection" as const,
    features: allFeatures,
  };
}

/**
 * Fetch statistics from an IGAC service.
 */
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

// === Convenience functions for specific services ===

export async function fetchMunicipiosIGAC() {
  return queryIGAC("Municipios", 0, {
    outFields:
      "MpCodigo,MpNombre,Depto,ESTADO_RURAL,ESTADO_URBANO,VIGENCIA_CATASTRAL_RURAL,VIGENCIA_CATASTRAL_URBANA,MpArea,MpAltitud",
    returnGeometry: false,
  });
}

export async function fetchCoberturaEstado() {
  return queryIGACStats("Municipios", 0, "MpCodigo", "ESTADO_RURAL");
}

export async function fetchHidrografia(bbox: string) {
  return queryIGAC("Hidrografia", 14, {
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
