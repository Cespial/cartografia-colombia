/**
 * datos.gov.co SODA API client.
 * Reused pattern from vigia-cordoba.
 */

const DATOS_GOV_BASE = "https://www.datos.gov.co/resource";

export async function fetchDatosGov(
  datasetId: string,
  params: Record<string, string> = {}
) {
  const searchParams = new URLSearchParams(params);
  const url = `${DATOS_GOV_BASE}/${datasetId}.json?${searchParams.toString()}`;
  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  const appToken = process.env.DATOS_GOV_APP_TOKEN;
  if (appToken) {
    headers["X-App-Token"] = appToken;
  }
  const res = await fetch(url, { headers, next: { revalidate: 3600 } });
  if (!res.ok) throw new Error(`datos.gov.co API error: ${res.status}`);
  return res.json();
}

// === Dataset IDs ===

export const DATASETS = {
  divipola: "gdxc-w37w",
  desempenoMunicipal: "nkjx-rsq7",
  emergenciasUNGRD: "wwkg-r6te",
} as const;

export async function fetchDIVIPOLA() {
  return fetchDatosGov(DATASETS.divipola, { $limit: "1200" });
}
