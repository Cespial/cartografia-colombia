"use client";

import { useState } from "react";
import { ESTADO_COLORS, ESTADO_LABELS } from "@/lib/coverage";
import type { CoverageStats } from "@/types";
import { ChevronDown, ChevronUp } from "lucide-react";

interface MapLegendProps {
  stats: CoverageStats | null;
}

export default function MapLegend({ stats }: MapLegendProps) {
  const [collapsed, setCollapsed] = useState(false);

  const entries = [
    { key: "POR FORMAR" as const },
    { key: "DESACTUALIZADO" as const },
    { key: "ACTUALIZADO PARCIAL" as const },
    { key: "ACTUALIZADO" as const },
  ];

  return (
    <div className="absolute bottom-3 left-3 sm:bottom-6 sm:left-6 bg-gray-900/95 backdrop-blur-sm border border-gray-700 rounded-xl text-sm z-10 max-w-[200px] sm:max-w-[240px]">
      {/* Header — tappable on mobile */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center justify-between p-3 sm:p-4 sm:pb-0"
      >
        <h3 className="font-semibold text-white text-xs sm:text-sm">Estado Catastral</h3>
        <span className="sm:hidden text-gray-500">
          {collapsed ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </span>
      </button>

      {/* Content — collapsible on mobile */}
      <div className={`${collapsed ? "hidden" : "block"} sm:block px-3 pb-3 sm:px-4 sm:pb-4 pt-2`}>
        <div className="space-y-1.5 sm:space-y-2">
          {entries.map(({ key }) => {
            const count = stats
              ? key === "POR FORMAR" ? stats.porFormar
              : key === "DESACTUALIZADO" ? stats.desactualizado
              : key === "ACTUALIZADO PARCIAL" ? stats.actualizadoParcial
              : stats.actualizado
              : null;

            return (
              <div key={key} className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <span
                    className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full inline-block flex-shrink-0"
                    style={{ backgroundColor: ESTADO_COLORS[key] }}
                  />
                  <span className="text-gray-300 text-[11px] sm:text-sm">{ESTADO_LABELS[key]}</span>
                </div>
                {count !== null && (
                  <span className="text-gray-500 font-mono text-[10px] sm:text-xs">
                    {count.toLocaleString()}
                  </span>
                )}
              </div>
            );
          })}
        </div>
        {stats && (
          <div className="mt-2 pt-2 border-t border-gray-700 text-gray-400 text-[10px] sm:text-xs">
            {stats.total.toLocaleString()} municipios
          </div>
        )}
      </div>
    </div>
  );
}
