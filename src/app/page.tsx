"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import type { MunicipioIGAC, CoverageStats, DepartmentCoverage } from "@/types";
import { computeCoverageStats, computeDepartmentCoverage } from "@/lib/coverage";
import StatsOverview from "@/components/dashboard/StatsOverview";
import SearchBar from "@/components/dashboard/SearchBar";
import DepartmentRanking from "@/components/dashboard/DepartmentRanking";
import MapLegend from "@/components/map/MapLegend";
import { Map as MapIcon, BarChart3 } from "lucide-react";

const NationalMap = dynamic(() => import("@/components/map/NationalMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-gray-900 flex items-center justify-center">
      <div className="text-gray-500">Cargando mapa...</div>
    </div>
  ),
});

export default function HomePage() {
  const [municipiosGeoJSON, setMunicipiosGeoJSON] =
    useState<GeoJSON.FeatureCollection | null>(null);
  const [igacData, setIgacData] = useState<MunicipioIGAC[]>([]);
  const [stats, setStats] = useState<CoverageStats | null>(null);
  const [departments, setDepartments] = useState<DepartmentCoverage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [geoRes, igacRes] = await Promise.all([
          fetch("/data/colombia-municipios.json"),
          fetch("/api/municipios"),
        ]);

        const geoData = await geoRes.json();
        setMunicipiosGeoJSON(geoData);

        const igacMunicipios: MunicipioIGAC[] = await igacRes.json();
        setIgacData(igacMunicipios);

        setStats(computeCoverageStats(igacMunicipios));
        setDepartments(computeDepartmentCoverage(igacMunicipios));
      } catch (error) {
        console.error("Error loading data:", error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const handleMunicipioClick = useCallback((codigo: string) => {
    window.open(`/municipio/${codigo}`, "_blank");
  }, []);

  const handleSearch = useCallback((codigo: string) => {
    window.open(`/municipio/${codigo}`, "_blank");
  }, []);

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <header className="bg-gray-900/95 backdrop-blur-sm border-b border-gray-800 px-6 py-3 flex items-center justify-between z-20">
        <div className="flex items-center gap-3">
          <MapIcon className="w-6 h-6 text-emerald-400" />
          <div>
            <h1 className="text-lg font-bold text-white">
              Cartografía Colombia
            </h1>
            <p className="text-xs text-gray-500">
              Estado catastral de 1,122 municipios
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="w-64">
            <SearchBar municipios={igacData} onSelect={handleSearch} />
          </div>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
            title="Toggle panel"
          >
            <BarChart3 className="w-5 h-5 text-gray-400" />
          </button>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Map */}
        <div className="flex-1 relative">
          <NationalMap
            municipiosGeoJSON={municipiosGeoJSON}
            igacData={igacData}
            onMunicipioClick={handleMunicipioClick}
          />
          <MapLegend stats={stats} />

          {loading && (
            <div className="absolute inset-0 bg-gray-950/80 flex items-center justify-center z-10">
              <div className="text-center">
                <div className="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-gray-400 text-sm">
                  Consultando IGAC...
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        {sidebarOpen && (
          <aside className="w-96 bg-gray-900/95 backdrop-blur-sm border-l border-gray-800 overflow-y-auto p-4 space-y-4">
            <StatsOverview stats={stats} />

            {stats && stats.porFormar > 0 && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
                <h3 className="font-semibold text-red-400 mb-2">
                  Municipios sin cartografía
                </h3>
                <p className="text-sm text-gray-400 mb-3">
                  {stats.porFormar} municipios no tienen formación catastral
                  rural. Se concentran en Chocó, Nariño, Guainía y Amazonas.
                </p>
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {igacData
                    .filter((m) => m.estadoRural === "POR FORMAR")
                    .sort((a, b) => a.departamento.localeCompare(b.departamento))
                    .map((m) => (
                      <button
                        key={m.codigo}
                        onClick={() => handleMunicipioClick(m.codigo)}
                        className="w-full text-left text-xs px-2 py-1 hover:bg-red-500/10 rounded transition-colors flex justify-between"
                      >
                        <span className="text-white">{m.nombre}</span>
                        <span className="text-gray-500">
                          {m.departamento}
                        </span>
                      </button>
                    ))}
                </div>
              </div>
            )}

            <DepartmentRanking departments={departments} />
          </aside>
        )}
      </div>
    </div>
  );
}
