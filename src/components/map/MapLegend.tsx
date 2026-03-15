"use client";

import { ESTADO_COLORS, ESTADO_LABELS } from "@/lib/coverage";
import type { CoverageStats } from "@/types";

interface MapLegendProps {
  stats: CoverageStats | null;
}

export default function MapLegend({ stats }: MapLegendProps) {
  const entries = [
    { key: "POR FORMAR" as const, icon: "●" },
    { key: "DESACTUALIZADO" as const, icon: "●" },
    { key: "ACTUALIZADO PARCIAL" as const, icon: "●" },
    { key: "ACTUALIZADO" as const, icon: "●" },
  ];

  return (
    <div className="absolute bottom-6 left-6 bg-gray-900/95 backdrop-blur-sm border border-gray-700 rounded-xl p-4 text-sm z-10 min-w-[240px]">
      <h3 className="font-semibold text-white mb-3">Estado Catastral</h3>
      <div className="space-y-2">
        {entries.map(({ key }) => {
          const count = stats
            ? key === "POR FORMAR"
              ? stats.porFormar
              : key === "DESACTUALIZADO"
                ? stats.desactualizado
                : key === "ACTUALIZADO PARCIAL"
                  ? stats.actualizadoParcial
                  : stats.actualizado
            : null;

          return (
            <div key={key} className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span
                  className="w-3 h-3 rounded-full inline-block flex-shrink-0"
                  style={{ backgroundColor: ESTADO_COLORS[key] }}
                />
                <span className="text-gray-300">{ESTADO_LABELS[key]}</span>
              </div>
              {count !== null && (
                <span className="text-gray-500 font-mono text-xs">
                  {count.toLocaleString()}
                </span>
              )}
            </div>
          );
        })}
      </div>
      {stats && (
        <div className="mt-3 pt-3 border-t border-gray-700 text-gray-400 text-xs">
          Total: {stats.total.toLocaleString()} municipios
        </div>
      )}
    </div>
  );
}
