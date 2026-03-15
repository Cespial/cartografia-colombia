"use client";

import type { CoverageStats } from "@/types";
import { MapPin, AlertTriangle, CheckCircle, Clock } from "lucide-react";

interface StatsOverviewProps {
  stats: CoverageStats | null;
}

export default function StatsOverview({ stats }: StatsOverviewProps) {
  if (!stats) {
    return (
      <div className="grid grid-cols-2 gap-2">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-gray-800/50 rounded-xl p-3 animate-pulse h-20" />
        ))}
      </div>
    );
  }

  const cards = [
    {
      label: "Sin cartografía",
      value: stats.porFormar,
      icon: AlertTriangle,
      color: "text-red-400",
      bg: "bg-red-500/10",
      pct: Math.round((stats.porFormar / stats.total) * 100),
    },
    {
      label: "Desactualizado",
      value: stats.desactualizado,
      icon: Clock,
      color: "text-orange-400",
      bg: "bg-orange-500/10",
      pct: Math.round((stats.desactualizado / stats.total) * 100),
    },
    {
      label: "Parcial",
      value: stats.actualizadoParcial,
      icon: MapPin,
      color: "text-yellow-400",
      bg: "bg-yellow-500/10",
      pct: Math.round((stats.actualizadoParcial / stats.total) * 100),
    },
    {
      label: "Actualizado",
      value: stats.actualizado,
      icon: CheckCircle,
      color: "text-green-400",
      bg: "bg-green-500/10",
      pct: Math.round((stats.actualizado / stats.total) * 100),
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-2">
      {cards.map((card) => (
        <div
          key={card.label}
          className={`${card.bg} border border-gray-700/50 rounded-xl p-3`}
        >
          <div className="flex items-center gap-1.5 mb-1">
            <card.icon className={`w-3.5 h-3.5 ${card.color}`} />
            <span className="text-gray-400 text-[11px] sm:text-sm">{card.label}</span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className={`text-xl sm:text-2xl font-bold ${card.color}`}>
              {card.value.toLocaleString()}
            </span>
            <span className="text-gray-500 text-[10px] sm:text-sm">{card.pct}%</span>
          </div>
        </div>
      ))}
    </div>
  );
}
