/**
 * Coverage analysis utilities.
 * Classifies municipalities by cadastral status and computes gap metrics.
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
      return {
        departamento,
        stats,
        porcentajeActualizado:
          Math.round(((stats.actualizado + stats.actualizadoParcial) / stats.total) * 100),
      };
    })
    .sort((a, b) => a.porcentajeActualizado - b.porcentajeActualizado);
}

export function parseIGACMunicipio(feature: Record<string, unknown>): MunicipioIGAC {
  const p = feature.properties as Record<string, unknown> ?? feature;
  return {
    codigo: String(p.MpCodigo ?? p.MPIO_CDPMP ?? ""),
    nombre: String(p.MpNombre ?? p.MPIO_CNMBR ?? ""),
    departamento: String(p.Depto ?? p.DPTO_CNMBR ?? ""),
    estadoRural: (p.ESTADO_RURAL as EstadoCatastral) ?? "DESACTUALIZADO",
    estadoUrbano: (p.ESTADO_URBANO as EstadoCatastral) ?? "DESACTUALIZADO",
    vigenciaRural: p.VIGENCIA_CATASTRAL_RURAL ? Number(p.VIGENCIA_CATASTRAL_RURAL) : null,
    vigenciaUrbana: p.VIGENCIA_CATASTRAL_URBANA ? Number(p.VIGENCIA_CATASTRAL_URBANA) : null,
    area: p.MpArea ? Number(p.MpArea) : null,
    altitud: p.MpAltitud ? Number(p.MpAltitud) : null,
  };
}
