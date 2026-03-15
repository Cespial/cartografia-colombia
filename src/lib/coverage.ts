/**
 * Coverage analysis utilities — expanded with predios, avalúos, department aggregation.
 */

import type { EstadoCatastral, CoverageStats, DepartmentCoverage, MunicipioIGAC } from "@/types";

export const ESTADO_COLORS: Record<EstadoCatastral, string> = {
  ACTUALIZADO: "#22c55e",
  "ACTUALIZADO PARCIAL": "#eab308",
  DESACTUALIZADO: "#f97316",
  "POR FORMAR": "#ef4444",
};

export const ESTADO_LABELS: Record<EstadoCatastral, string> = {
  ACTUALIZADO: "Actualizado",
  "ACTUALIZADO PARCIAL": "Parcialmente actualizado",
  DESACTUALIZADO: "Desactualizado",
  "POR FORMAR": "Sin cartografía",
};

export function computeCoverageStats(municipios: MunicipioIGAC[]): CoverageStats {
  return {
    total: municipios.length,
    actualizado: municipios.filter((m) => m.estadoRural === "ACTUALIZADO").length,
    actualizadoParcial: municipios.filter((m) => m.estadoRural === "ACTUALIZADO PARCIAL").length,
    desactualizado: municipios.filter((m) => m.estadoRural === "DESACTUALIZADO").length,
    porFormar: municipios.filter((m) => m.estadoRural === "POR FORMAR").length,
  };
}

export function computeDepartmentCoverage(municipios: MunicipioIGAC[]): DepartmentCoverage[] {
  const byDept = new Map<string, MunicipioIGAC[]>();

  for (const m of municipios) {
    const dept = m.departamento || "Sin departamento";
    if (!byDept.has(dept)) byDept.set(dept, []);
    byDept.get(dept)!.push(m);
  }

  return Array.from(byDept.entries())
    .map(([departamento, munis]) => {
      const stats = computeCoverageStats(munis);
      const totalPredios = munis.reduce((s, m) => s + (m.totalPredios ?? 0), 0);
      const avaluoTotal = munis.reduce((s, m) => s + (m.avaluoRural ?? 0) + (m.avaluoUrbano ?? 0), 0);
      return {
        departamento,
        stats,
        porcentajeActualizado:
          Math.round(((stats.actualizado + stats.actualizadoParcial) / stats.total) * 100),
        totalPredios,
        avaluoTotal,
      };
    })
    .sort((a, b) => a.porcentajeActualizado - b.porcentajeActualizado);
}

/** Vigencia distribution: how many municipalities last updated in each year */
export function computeVigenciaDistribution(municipios: MunicipioIGAC[]): Record<string, number> {
  const dist: Record<string, number> = {};
  for (const m of municipios) {
    const year = m.vigenciaRural ? String(m.vigenciaRural) : "Sin vigencia";
    dist[year] = (dist[year] ?? 0) + 1;
  }
  return dist;
}

/** PDET vs non-PDET split */
export function computePDETStats(municipios: MunicipioIGAC[]) {
  const pdet = municipios.filter((m) => m.pdet && m.pdet !== "NO" && m.pdet !== "");
  const noPdet = municipios.filter((m) => !m.pdet || m.pdet === "NO" || m.pdet === "");
  return {
    pdet: { count: pdet.length, stats: computeCoverageStats(pdet) },
    noPdet: { count: noPdet.length, stats: computeCoverageStats(noPdet) },
  };
}

/** Gestor catastral distribution */
export function computeGestorDistribution(municipios: MunicipioIGAC[]): Record<string, number> {
  const dist: Record<string, number> = {};
  for (const m of municipios) {
    const gestor = m.gestorCatastral || "Sin gestor";
    dist[gestor] = (dist[gestor] ?? 0) + 1;
  }
  return dist;
}

function num(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return isNaN(n) ? null : n;
}

function str(v: unknown): string | null {
  if (v === null || v === undefined || v === "") return null;
  return String(v);
}

export function parseIGACMunicipio(feature: Record<string, unknown>): MunicipioIGAC {
  const p = (feature.properties as Record<string, unknown>) ?? feature;
  return {
    codigo: String(p.MpCodigo ?? p.MPIO_CDPMP ?? ""),
    nombre: String(p.MpNombre ?? p.MPIO_CNMBR ?? ""),
    departamento: String(p.Depto ?? p.DPTO_CNMBR ?? ""),
    estadoRural: (p.ESTADO_RURAL as EstadoCatastral) ?? "DESACTUALIZADO",
    estadoUrbano: (p.ESTADO_URBANO as EstadoCatastral) ?? "DESACTUALIZADO",
    vigenciaRural: num(p.VIGENCIA_CATASTRAL_RURAL),
    vigenciaUrbana: num(p.VIGENCIA_CATASTRAL_URBANA),
    area: num(p.MpArea),
    altitud: num(p.MpAltitud),
    // Predios
    prediosRurales: num(p.PREDIOS_RURALES),
    prediosUrbanos: num(p.PREDIOS_URBANOS),
    totalPredios: num(p.Total_PREDIOS),
    // Avalúos
    avaluoRural: num(p["AVALÚO_RURAL____E"]),
    avaluoUrbano: num(p["AVALÚO_URBANO_____E"]),
    // Áreas geográficas
    areaRuralHa: num(p["AREA_GEOGRÁFICA_RURAL_HECTÁREAS"]),
    areaUrbanaHa: num(p["AREA_GEOGRÁFICA_URBANA_HECTÁREA"]),
    areaTotalHa: num(p["AREA_GEOGRÁFICA_TOTAL_HECTÁREAS"]),
    // Clasificación
    gestorCatastral: str(p.GESTOR_CATASTRAL),
    pdet: str(p.PDET),
    ley617: str(p.Ley617),
    categoriaMunicipal: str(p.MpCategor),
    // Programación
    anoProgramado: num(p["AÑO_PROGRAMADO"]),
    metaFecha: str(p.META_FECHA),
    valorActualizacion: num(p["VALOR_ACTUALIZACIÓN_IGAC_POR_MU"]),
    zonaIntervencion: str(p["Zona_de_intervención"]),
  };
}

/** Format COP currency */
export function formatCOP(value: number): string {
  if (value >= 1_000_000_000_000) return `$${(value / 1_000_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1)}MM`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  return `$${value.toLocaleString()}`;
}
