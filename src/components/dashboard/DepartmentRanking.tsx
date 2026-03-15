"use client";

import Link from "next/link";
import type { DepartmentCoverage } from "@/types";
import { ESTADO_COLORS } from "@/lib/coverage";

interface DepartmentRankingProps {
  departments: DepartmentCoverage[];
}

export default function DepartmentRanking({ departments }: DepartmentRankingProps) {
  if (departments.length === 0) {
    return (
      <div className="bg-gray-800/50 rounded-xl p-4 animate-pulse h-96" />
    );
  }

  return (
    <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4">
      <h3 className="font-semibold text-white mb-4">
        Departamentos por Cobertura Catastral
      </h3>
      <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
        {departments.map((dept) => {
          const { stats } = dept;
          const total = stats.total || 1;

          return (
            <Link key={dept.departamento} href={`/departamento/${encodeURIComponent(dept.departamento)}`} className="block group">
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-gray-300 group-hover:text-white transition-colors">
                  {dept.departamento}
                </span>
                <span className="text-gray-500 text-xs">
                  {stats.total} mun.
                </span>
              </div>
              {/* Stacked bar */}
              <div className="h-3 bg-gray-700 rounded-full overflow-hidden flex">
                {stats.porFormar > 0 && (
                  <div
                    className="h-full"
                    style={{
                      width: `${(stats.porFormar / total) * 100}%`,
                      backgroundColor: ESTADO_COLORS["POR FORMAR"],
                    }}
                  />
                )}
                {stats.desactualizado > 0 && (
                  <div
                    className="h-full"
                    style={{
                      width: `${(stats.desactualizado / total) * 100}%`,
                      backgroundColor: ESTADO_COLORS.DESACTUALIZADO,
                    }}
                  />
                )}
                {stats.actualizadoParcial > 0 && (
                  <div
                    className="h-full"
                    style={{
                      width: `${(stats.actualizadoParcial / total) * 100}%`,
                      backgroundColor: ESTADO_COLORS["ACTUALIZADO PARCIAL"],
                    }}
                  />
                )}
                {stats.actualizado > 0 && (
                  <div
                    className="h-full"
                    style={{
                      width: `${(stats.actualizado / total) * 100}%`,
                      backgroundColor: ESTADO_COLORS.ACTUALIZADO,
                    }}
                  />
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
