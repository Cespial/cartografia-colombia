"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import type { MunicipioIGAC, CoverageStats, DepartmentCoverage } from "@/types";
import { computeCoverageStats, computeDepartmentCoverage } from "@/lib/coverage";
import StatsOverview from "@/components/dashboard/StatsOverview";
import SearchBar from "@/components/dashboard/SearchBar";
import DepartmentRanking from "@/components/dashboard/DepartmentRanking";
import MapLegend from "@/components/map/MapLegend";
import Link from "next/link";
import TensorLogo from "@/components/ui/TensorLogo";
import { BarChart3, Layers, PieChart, X } from "lucide-react";

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
  const [panelOpen, setPanelOpen] = useState(false);

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
    window.location.href = `/municipio/${codigo}`;
  }, []);

  return (
    <div className="h-[100dvh] flex flex-col">
      {/* Header — mobile-first */}
      <header className="bg-gray-900/95 backdrop-blur-sm border-b border-gray-800 px-3 sm:px-6 py-2.5 z-20 flex-shrink-0">
        {/* Top row: logo + actions */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <TensorLogo size={24} showText={false} />
            <div className="min-w-0">
              <h1 className="text-sm sm:text-lg font-bold text-white truncate">
                Cartografía Colombia
              </h1>
              <p className="text-[10px] sm:text-xs text-gray-500 hidden sm:block">
                Estado catastral · 1,122 municipios
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-3">
            {/* Nav links — hidden on mobile, icons only on tablet */}
            <Link href="/explorador" className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-lg text-xs sm:text-sm text-gray-300 transition-colors">
              <Layers className="w-4 h-4" />
              <span className="hidden md:inline">Explorador</span>
            </Link>
            <Link href="/cobertura" className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-lg text-xs sm:text-sm text-gray-300 transition-colors">
              <PieChart className="w-4 h-4" />
              <span className="hidden md:inline">Cobertura</span>
            </Link>

            {/* Search — responsive width */}
            <div className="w-40 sm:w-56 md:w-64">
              <SearchBar municipios={igacData} onSelect={handleMunicipioClick} />
            </div>

            {/* Panel toggle */}
            <button
              onClick={() => setPanelOpen(!panelOpen)}
              className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
            >
              {panelOpen ? <X className="w-5 h-5 text-gray-400" /> : <BarChart3 className="w-5 h-5 text-gray-400" />}
            </button>
          </div>
        </div>

        {/* Mobile nav row */}
        <div className="flex sm:hidden items-center gap-3 mt-2 text-[11px]">
          <TensorLogo size={16} showText={true} className="text-[11px]" />
          <span className="text-gray-700">|</span>
          <Link href="/explorador" className="text-gray-400 hover:text-white">Explorador</Link>
          <Link href="/cobertura" className="text-gray-400 hover:text-white">Cobertura</Link>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Map — always full width */}
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
                <p className="text-gray-400 text-sm">Consultando IGAC...</p>
              </div>
            </div>
          )}
        </div>

        {/* Panel — slides over on mobile, sidebar on desktop */}
        {panelOpen && (
          <>
            {/* Backdrop on mobile */}
            <div
              className="fixed inset-0 bg-black/50 z-30 lg:hidden"
              onClick={() => setPanelOpen(false)}
            />
            <aside className="fixed right-0 top-0 bottom-0 w-[85vw] sm:w-80 lg:w-96 lg:static bg-gray-900/98 backdrop-blur-md border-l border-gray-800 overflow-y-auto p-4 space-y-4 z-40">
              {/* Close button on mobile */}
              <div className="flex items-center justify-between lg:hidden mb-2">
                <h2 className="text-sm font-semibold text-white">Estadísticas</h2>
                <button onClick={() => setPanelOpen(false)} className="p-1.5 hover:bg-gray-800 rounded-lg">
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              <StatsOverview stats={stats} />

              {stats && stats.porFormar > 0 && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 sm:p-4">
                  <h3 className="font-semibold text-red-400 mb-2 text-sm">
                    Municipios sin cartografía
                  </h3>
                  <p className="text-xs text-gray-400 mb-3">
                    {stats.porFormar} municipios sin formación catastral rural.
                  </p>
                  <div className="max-h-40 overflow-y-auto space-y-0.5">
                    {igacData
                      .filter((m) => m.estadoRural === "POR FORMAR")
                      .sort((a, b) => a.departamento.localeCompare(b.departamento))
                      .map((m) => (
                        <button
                          key={m.codigo}
                          onClick={() => { handleMunicipioClick(m.codigo); setPanelOpen(false); }}
                          className="w-full text-left text-xs px-2 py-1 hover:bg-red-500/10 rounded transition-colors flex justify-between"
                        >
                          <span className="text-white">{m.nombre}</span>
                          <span className="text-gray-500 truncate ml-2">{m.departamento}</span>
                        </button>
                      ))}
                  </div>
                </div>
              )}

              <DepartmentRanking departments={departments} />

              {/* tensor.lat footer */}
              <div className="pt-3 border-t border-gray-800 flex justify-center">
                <TensorLogo size={18} showText={true} />
              </div>
            </aside>
          </>
        )}
      </div>
    </div>
  );
}
