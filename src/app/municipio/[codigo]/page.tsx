"use client";

import { useState, useEffect, use } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import type { MunicipioIGAC } from "@/types";
import { ESTADO_COLORS, ESTADO_LABELS } from "@/lib/coverage";
import {
  ArrowLeft,
  MapPin,
  Mountain,
  Ruler,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Clock,
} from "lucide-react";

const MunicipalMap = dynamic(() => import("@/components/map/MunicipalMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[500px] bg-gray-900 rounded-xl flex items-center justify-center">
      <div className="text-gray-500">Cargando mapa...</div>
    </div>
  ),
});

function StatusIcon({ estado }: { estado: string }) {
  switch (estado) {
    case "ACTUALIZADO":
      return <CheckCircle className="w-5 h-5 text-green-400" />;
    case "ACTUALIZADO PARCIAL":
      return <Clock className="w-5 h-5 text-yellow-400" />;
    case "POR FORMAR":
      return <AlertTriangle className="w-5 h-5 text-red-400" />;
    default:
      return <Clock className="w-5 h-5 text-orange-400" />;
  }
}

export default function MunicipioPage({
  params,
}: {
  params: Promise<{ codigo: string }>;
}) {
  const { codigo } = use(params);
  const [municipio, setMunicipio] = useState<MunicipioIGAC | null>(null);
  const [allMunicipios, setAllMunicipios] = useState<MunicipioIGAC[]>([]);
  const [municipioGeoJSON, setMunicipioGeoJSON] =
    useState<GeoJSON.FeatureCollection | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        // Load IGAC data
        const igacRes = await fetch("/api/municipios");
        const igacMunicipios: MunicipioIGAC[] = await igacRes.json();
        setAllMunicipios(igacMunicipios);

        const found = igacMunicipios.find((m) => m.codigo === codigo);
        setMunicipio(found ?? null);

        // Load GeoJSON and find matching municipality
        const geoRes = await fetch("/data/colombia-municipios.json");
        const geoData: GeoJSON.FeatureCollection = await geoRes.json();

        if (found) {
          const matching = geoData.features.filter((f) => {
            const name = String(f.properties?.name ?? "").toUpperCase();
            return name === found.nombre.toUpperCase();
          });

          if (matching.length > 0) {
            setMunicipioGeoJSON({
              type: "FeatureCollection",
              features: matching,
            });
          }
        }
      } catch (error) {
        console.error("Error loading municipality data:", error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [codigo]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!municipio) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400 text-lg mb-4">
            Municipio no encontrado: {codigo}
          </p>
          <Link
            href="/"
            className="text-emerald-400 hover:text-emerald-300 flex items-center gap-2 justify-center"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver al mapa
          </Link>
        </div>
      </div>
    );
  }

  // Find neighboring municipalities in the same department
  const sameDepto = allMunicipios
    .filter(
      (m) =>
        m.departamento === municipio.departamento && m.codigo !== municipio.codigo
    )
    .slice(0, 10);

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <header className="bg-gray-900/95 backdrop-blur-sm border-b border-gray-800 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center gap-4">
          <Link
            href="/"
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-400" />
          </Link>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-white">{municipio.nombre}</h1>
            <p className="text-sm text-gray-500">{municipio.departamento}</p>
          </div>
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium"
            style={{
              backgroundColor:
                ESTADO_COLORS[municipio.estadoRural] + "20",
              color: ESTADO_COLORS[municipio.estadoRural],
              border: `1px solid ${ESTADO_COLORS[municipio.estadoRural]}40`,
            }}
          >
            <StatusIcon estado={municipio.estadoRural} />
            {ESTADO_LABELS[municipio.estadoRural]}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {/* Stats cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <MapPin className="w-4 h-4 text-gray-500" />
              <span className="text-xs text-gray-500">Código DANE</span>
            </div>
            <p className="text-lg font-mono text-white">{municipio.codigo}</p>
          </div>
          <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <Ruler className="w-4 h-4 text-gray-500" />
              <span className="text-xs text-gray-500">Área</span>
            </div>
            <p className="text-lg font-mono text-white">
              {municipio.area
                ? `${Math.round(municipio.area).toLocaleString()} km²`
                : "—"}
            </p>
          </div>
          <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <Mountain className="w-4 h-4 text-gray-500" />
              <span className="text-xs text-gray-500">Altitud</span>
            </div>
            <p className="text-lg font-mono text-white">
              {municipio.altitud ? `${municipio.altitud} msnm` : "—"}
            </p>
          </div>
          <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <Calendar className="w-4 h-4 text-gray-500" />
              <span className="text-xs text-gray-500">Vigencia catastral</span>
            </div>
            <p className="text-lg font-mono text-white">
              {municipio.vigenciaRural ?? "Sin vigencia"}
            </p>
          </div>
        </div>

        {/* Map + sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl overflow-hidden h-[500px]">
              <MunicipalMap geojson={municipioGeoJSON} name={municipio.nombre} />
            </div>
          </div>

          {/* Sidebar info */}
          <div className="space-y-4">
            {/* Urban vs Rural status */}
            <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4">
              <h3 className="font-semibold text-white mb-3">Estado Catastral</h3>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Rural</p>
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{
                        backgroundColor:
                          ESTADO_COLORS[municipio.estadoRural],
                      }}
                    />
                    <span className="text-sm text-gray-300">
                      {ESTADO_LABELS[municipio.estadoRural]}
                    </span>
                    {municipio.vigenciaRural && (
                      <span className="text-xs text-gray-500 ml-auto">
                        {municipio.vigenciaRural}
                      </span>
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Urbano</p>
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{
                        backgroundColor:
                          ESTADO_COLORS[municipio.estadoUrbano],
                      }}
                    />
                    <span className="text-sm text-gray-300">
                      {ESTADO_LABELS[municipio.estadoUrbano]}
                    </span>
                    {municipio.vigenciaUrbana && (
                      <span className="text-xs text-gray-500 ml-auto">
                        {municipio.vigenciaUrbana}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Other municipalities in same department */}
            <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4">
              <h3 className="font-semibold text-white mb-3">
                Otros municipios en {municipio.departamento}
              </h3>
              <div className="space-y-1 max-h-60 overflow-y-auto">
                {sameDepto.map((m) => (
                  <Link
                    key={m.codigo}
                    href={`/municipio/${m.codigo}`}
                    className="flex items-center justify-between text-sm px-2 py-1.5 hover:bg-gray-700/50 rounded transition-colors"
                  >
                    <span className="text-gray-300">{m.nombre}</span>
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{
                        backgroundColor: ESTADO_COLORS[m.estadoRural],
                      }}
                    />
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
