"use client";

import { useState, useEffect, use } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import type { MunicipioIGAC } from "@/types";
import { ESTADO_COLORS, ESTADO_LABELS, formatCOP } from "@/lib/coverage";
import {
  ArrowLeft, MapPin, Mountain, Ruler, Calendar, AlertTriangle,
  CheckCircle, Clock, Building2, Landmark, Wheat, ShieldAlert,
  Signal, GraduationCap, HeartPulse, Loader2,
} from "lucide-react";

const MunicipalMap = dynamic(() => import("@/components/map/MunicipalMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[500px] bg-gray-900 rounded-xl flex items-center justify-center">
      <div className="text-gray-500">Cargando mapa...</div>
    </div>
  ),
});

type Tab = "general" | "educacion" | "salud" | "seguridad" | "agricultura" | "infraestructura";

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "general", label: "General", icon: Building2 },
  { id: "educacion", label: "Educación", icon: GraduationCap },
  { id: "salud", label: "Salud", icon: HeartPulse },
  { id: "seguridad", label: "Seguridad", icon: ShieldAlert },
  { id: "agricultura", label: "Agricultura", icon: Wheat },
  { id: "infraestructura", label: "Infraestructura", icon: Signal },
];

function StatusIcon({ estado }: { estado: string }) {
  switch (estado) {
    case "ACTUALIZADO": return <CheckCircle className="w-5 h-5 text-green-400" />;
    case "ACTUALIZADO PARCIAL": return <Clock className="w-5 h-5 text-yellow-400" />;
    case "POR FORMAR": return <AlertTriangle className="w-5 h-5 text-red-400" />;
    default: return <Clock className="w-5 h-5 text-orange-400" />;
  }
}

/* eslint-disable @typescript-eslint/no-explicit-any */

export default function MunicipioPage({ params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = use(params);
  const [municipio, setMunicipio] = useState<MunicipioIGAC | null>(null);
  const [allMunicipios, setAllMunicipios] = useState<MunicipioIGAC[]>([]);
  const [municipioGeoJSON, setMunicipioGeoJSON] = useState<GeoJSON.FeatureCollection | null>(null);
  const [enrichment, setEnrichment] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [enrichLoading, setEnrichLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("general");

  useEffect(() => {
    async function loadData() {
      try {
        const [igacRes, geoRes] = await Promise.all([
          fetch("/api/municipios"),
          fetch("/data/colombia-municipios.json"),
        ]);
        const igacMunicipios: MunicipioIGAC[] = await igacRes.json();
        const geoData: GeoJSON.FeatureCollection = await geoRes.json();

        setAllMunicipios(igacMunicipios);
        const found = igacMunicipios.find((m) => m.codigo === codigo);
        setMunicipio(found ?? null);

        if (found) {
          const matching = geoData.features.filter(
            (f) => String(f.properties?.name ?? "").toUpperCase() === found.nombre.toUpperCase()
          );
          if (matching.length > 0) {
            setMunicipioGeoJSON({ type: "FeatureCollection", features: matching });
          }
        }
      } catch (e) {
        console.error("Error loading data:", e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [codigo]);

  // Fetch enrichment data from datos.gov.co
  useEffect(() => {
    if (!codigo) return;
    setEnrichLoading(true);
    fetch(`/api/municipios/${codigo}`)
      .then((r) => r.json())
      .then(setEnrichment)
      .catch(() => setEnrichment(null))
      .finally(() => setEnrichLoading(false));
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
          <p className="text-gray-400 text-lg mb-4">Municipio no encontrado: {codigo}</p>
          <Link href="/" className="text-emerald-400 hover:text-emerald-300 flex items-center gap-2 justify-center">
            <ArrowLeft className="w-4 h-4" /> Volver al mapa
          </Link>
        </div>
      </div>
    );
  }

  const sameDepto = allMunicipios
    .filter((m) => m.departamento === municipio.departamento && m.codigo !== municipio.codigo)
    .slice(0, 15);

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <header className="bg-gray-900/95 backdrop-blur-sm border-b border-gray-800 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center gap-4">
          <Link href="/" className="p-2 hover:bg-gray-800 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5 text-gray-400" />
          </Link>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-white">{municipio.nombre}</h1>
            <Link href={`/departamento/${encodeURIComponent(municipio.departamento)}`} className="text-sm text-gray-500 hover:text-gray-300 transition-colors">
              {municipio.departamento}
            </Link>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium"
            style={{
              backgroundColor: ESTADO_COLORS[municipio.estadoRural] + "20",
              color: ESTADO_COLORS[municipio.estadoRural],
              border: `1px solid ${ESTADO_COLORS[municipio.estadoRural]}40`,
            }}>
            <StatusIcon estado={municipio.estadoRural} />
            {ESTADO_LABELS[municipio.estadoRural]}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {/* Stats cards — expanded */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {[
            { icon: MapPin, label: "Código DANE", value: municipio.codigo },
            { icon: Ruler, label: "Área", value: municipio.area ? `${Math.round(municipio.area).toLocaleString()} km²` : "—" },
            { icon: Mountain, label: "Altitud", value: municipio.altitud ? `${municipio.altitud} msnm` : "—" },
            { icon: Calendar, label: "Vigencia", value: municipio.vigenciaRural ?? "Sin vigencia" },
            { icon: Building2, label: "Predios totales", value: municipio.totalPredios?.toLocaleString() ?? "—" },
            { icon: Landmark, label: "Avalúo total", value: (municipio.avaluoRural || municipio.avaluoUrbano) ? formatCOP((municipio.avaluoRural ?? 0) + (municipio.avaluoUrbano ?? 0)) : "—" },
          ].map((card) => (
            <div key={card.label} className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <card.icon className="w-4 h-4 text-gray-500" />
                <span className="text-xs text-gray-500">{card.label}</span>
              </div>
              <p className="text-lg font-mono text-white">{card.value}</p>
            </div>
          ))}
        </div>

        {/* Map */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl overflow-hidden h-[500px]">
              <MunicipalMap geojson={municipioGeoJSON} name={municipio.nombre} />
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Catastral status */}
            <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4">
              <h3 className="font-semibold text-white mb-3">Estado Catastral</h3>
              <div className="space-y-3">
                {(["Rural", "Urbano"] as const).map((tipo) => {
                  const estado = tipo === "Rural" ? municipio.estadoRural : municipio.estadoUrbano;
                  const vigencia = tipo === "Rural" ? municipio.vigenciaRural : municipio.vigenciaUrbana;
                  return (
                    <div key={tipo}>
                      <p className="text-xs text-gray-500 mb-1">{tipo}</p>
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: ESTADO_COLORS[estado] }} />
                        <span className="text-sm text-gray-300">{ESTADO_LABELS[estado]}</span>
                        {vigencia && <span className="text-xs text-gray-500 ml-auto">{vigencia}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
              {/* Extra IGAC metadata */}
              <div className="mt-4 pt-3 border-t border-gray-700 space-y-2 text-sm">
                {municipio.gestorCatastral && (
                  <div className="flex justify-between"><span className="text-gray-500">Gestor catastral</span><span className="text-gray-300">{municipio.gestorCatastral}</span></div>
                )}
                {municipio.categoriaMunicipal && (
                  <div className="flex justify-between"><span className="text-gray-500">Categoría</span><span className="text-gray-300">{municipio.categoriaMunicipal}</span></div>
                )}
                {municipio.ley617 && (
                  <div className="flex justify-between"><span className="text-gray-500">Ley 617</span><span className="text-gray-300">{municipio.ley617}</span></div>
                )}
                {municipio.pdet && municipio.pdet !== "NO" && (
                  <div className="flex justify-between"><span className="text-gray-500">PDET</span><span className="text-emerald-400 font-medium">Sí</span></div>
                )}
                {municipio.prediosRurales != null && (
                  <div className="flex justify-between"><span className="text-gray-500">Predios rurales</span><span className="text-gray-300">{municipio.prediosRurales.toLocaleString()}</span></div>
                )}
                {municipio.prediosUrbanos != null && (
                  <div className="flex justify-between"><span className="text-gray-500">Predios urbanos</span><span className="text-gray-300">{municipio.prediosUrbanos.toLocaleString()}</span></div>
                )}
                {municipio.anoProgramado && (
                  <div className="flex justify-between"><span className="text-gray-500">Actualización programada</span><span className="text-blue-400">{municipio.anoProgramado}</span></div>
                )}
              </div>
            </div>

            {/* Same department */}
            <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4">
              <h3 className="font-semibold text-white mb-3">Otros en {municipio.departamento}</h3>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {sameDepto.map((m) => (
                  <Link key={m.codigo} href={`/municipio/${m.codigo}`}
                    className="flex items-center justify-between text-sm px-2 py-1.5 hover:bg-gray-700/50 rounded transition-colors">
                    <span className="text-gray-300">{m.nombre}</span>
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: ESTADO_COLORS[m.estadoRural] }} />
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Enrichment tabs — datos.gov.co */}
        <div>
          <div className="flex gap-1 p-1 bg-gray-800/50 rounded-lg overflow-x-auto">
            {TABS.map((tab) => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition-all whitespace-nowrap ${
                  activeTab === tab.id ? "bg-gray-700 text-white" : "text-gray-500 hover:text-gray-300"
                }`}>
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>

          <div className="mt-4">
            {enrichLoading ? (
              <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-8 flex items-center justify-center">
                <Loader2 className="w-6 h-6 text-gray-500 animate-spin" />
                <span className="ml-3 text-gray-500">Consultando datos.gov.co...</span>
              </div>
            ) : (
              <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-5">
                {activeTab === "general" && <GeneralTab municipio={municipio} enrichment={enrichment} />}
                {activeTab === "educacion" && <EducacionTab enrichment={enrichment} />}
                {activeTab === "salud" && <SaludTab enrichment={enrichment} municipio={municipio} />}
                {activeTab === "seguridad" && <SeguridadTab enrichment={enrichment} />}
                {activeTab === "agricultura" && <AgriculturaTab enrichment={enrichment} />}
                {activeTab === "infraestructura" && <InfraestructuraTab enrichment={enrichment} municipio={municipio} />}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

// === Tab Components ===

function GeneralTab({ municipio, enrichment }: { municipio: MunicipioIGAC; enrichment: any }) {
  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-white text-lg">Información General</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h4 className="text-sm text-gray-400 mb-2">Datos Catastrales</h4>
          <div className="space-y-1.5 text-sm">
            <Row label="Área rural" value={municipio.areaRuralHa ? `${Math.round(municipio.areaRuralHa).toLocaleString()} ha` : "—"} />
            <Row label="Área urbana" value={municipio.areaUrbanaHa ? `${Math.round(municipio.areaUrbanaHa).toLocaleString()} ha` : "—"} />
            <Row label="Avalúo rural" value={municipio.avaluoRural ? formatCOP(municipio.avaluoRural) : "—"} />
            <Row label="Avalúo urbano" value={municipio.avaluoUrbano ? formatCOP(municipio.avaluoUrbano) : "—"} />
            {municipio.valorActualizacion && <Row label="Costo actualización" value={formatCOP(municipio.valorActualizacion)} />}
            {municipio.zonaIntervencion && <Row label="Zona intervención" value={municipio.zonaIntervencion} />}
          </div>
        </div>
        <div>
          <h4 className="text-sm text-gray-400 mb-2">Turismo (RNT)</h4>
          <div className="space-y-1.5 text-sm">
            <Row label="Prestadores registrados" value={enrichment?.turismo?.prestadores ?? "—"} />
            <Row label="Habitaciones" value={enrichment?.turismo?.habitaciones?.toLocaleString() ?? "—"} />
            <Row label="Camas" value={enrichment?.turismo?.camas?.toLocaleString() ?? "—"} />
          </div>
        </div>
      </div>
    </div>
  );
}

function EducacionTab({ enrichment }: { enrichment: any }) {
  const edu = enrichment?.educacion;
  if (!edu) return <EmptyState text="No se encontraron datos de educación para este municipio" />;
  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-white text-lg">Educación (MEN)</h3>
      <p className="text-xs text-gray-500">Fuente: Ministerio de Educación Nacional — datos.gov.co</p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Object.entries(edu).filter(([k]) => !k.startsWith("c_digo") && !k.startsWith("municipio") && !k.startsWith("departamento")).slice(0, 12).map(([key, value]) => (
          <div key={key} className="bg-gray-700/30 rounded-lg p-3">
            <p className="text-xs text-gray-500 truncate">{key.replace(/_/g, " ")}</p>
            <p className="text-lg font-mono text-white">{value != null ? String(value) : "—"}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function SaludTab({ enrichment, municipio }: { enrichment: any; municipio: MunicipioIGAC }) {
  const [ips, setIps] = useState<any[]>([]);
  const [loadingIps, setLoadingIps] = useState(false);

  useEffect(() => {
    setLoadingIps(true);
    fetch(`/api/municipios/${municipio.codigo}`)
      .then(r => r.json())
      .then(() => {
        // IPS data would need a separate endpoint, show what we have
        setIps([]);
      })
      .catch(() => setIps([]))
      .finally(() => setLoadingIps(false));
  }, [municipio.codigo]);

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-white text-lg">Salud</h3>
      <p className="text-xs text-gray-500">Fuente: MinSalud REPS — datos.gov.co</p>
      {loadingIps ? (
        <div className="flex items-center gap-2 text-gray-500"><Loader2 className="w-4 h-4 animate-spin" /> Cargando...</div>
      ) : ips.length === 0 ? (
        <EmptyState text="Datos de IPS disponibles vía API directa. Próximamente se integrarán al detalle." />
      ) : null}
    </div>
  );
}

function SeguridadTab({ enrichment }: { enrichment: any }) {
  const homicidios = enrichment?.homicidios ?? [];
  if (homicidios.length === 0) return <EmptyState text="No se encontraron datos de homicidios para este municipio" />;
  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-white text-lg">Seguridad</h3>
      <p className="text-xs text-gray-500">Fuente: Medicina Legal — datos.gov.co</p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-gray-700">
            <th className="text-left py-2 text-gray-400">Año</th>
            <th className="text-right py-2 text-gray-400">Homicidios</th>
          </tr></thead>
          <tbody>
            {homicidios.map((h: any) => (
              <tr key={h.a_o} className="border-b border-gray-800">
                <td className="py-2 text-gray-300">{h.a_o}</td>
                <td className="py-2 text-right font-mono text-white">{h.cantidad}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AgriculturaTab({ enrichment }: { enrichment: any }) {
  const cultivos = enrichment?.agricultura ?? [];
  if (cultivos.length === 0) return <EmptyState text="No se encontraron datos agrícolas (EVA) para este municipio" />;
  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-white text-lg">Agricultura (EVA)</h3>
      <p className="text-xs text-gray-500">Fuente: Evaluaciones Agropecuarias — datos.gov.co</p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-gray-700">
            <th className="text-left py-2 text-gray-400">Cultivo</th>
            <th className="text-right py-2 text-gray-400">Año</th>
            <th className="text-right py-2 text-gray-400">Área (ha)</th>
            <th className="text-right py-2 text-gray-400">Producción (t)</th>
            <th className="text-right py-2 text-gray-400">Rendimiento</th>
          </tr></thead>
          <tbody>
            {cultivos.slice(0, 20).map((c: any, i: number) => (
              <tr key={i} className="border-b border-gray-800">
                <td className="py-2 text-gray-300">{c.cultivo ?? c.grupo_de_cultivo ?? "—"}</td>
                <td className="py-2 text-right text-gray-400">{c.a_o ?? c.periodo ?? "—"}</td>
                <td className="py-2 text-right font-mono text-white">{Number(c.rea_sembrada ?? c.area_sembrada ?? 0).toLocaleString()}</td>
                <td className="py-2 text-right font-mono text-white">{Number(c.producci_n ?? c.produccion ?? 0).toLocaleString()}</td>
                <td className="py-2 text-right font-mono text-gray-400">{Number(c.rendimiento ?? 0).toFixed(1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function InfraestructuraTab({ enrichment, municipio }: { enrichment: any; municipio: MunicipioIGAC }) {
  const telco = enrichment?.telecomunicaciones ?? [];
  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-white text-lg">Infraestructura y Conectividad</h3>
      <p className="text-xs text-gray-500">Fuente: MinTIC — datos.gov.co</p>
      {telco.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-gray-700">
              <th className="text-left py-2 text-gray-400">Proveedor</th>
              <th className="text-center py-2 text-gray-400">2G</th>
              <th className="text-center py-2 text-gray-400">3G</th>
              <th className="text-center py-2 text-gray-400">4G</th>
              <th className="text-center py-2 text-gray-400">LTE</th>
            </tr></thead>
            <tbody>
              {telco.map((t: any, i: number) => (
                <tr key={i} className="border-b border-gray-800">
                  <td className="py-2 text-gray-300">{t.proveedor ?? t.operador ?? "—"}</td>
                  {["2g", "3g", "4g", "lte"].map((tech) => (
                    <td key={tech} className="py-2 text-center">
                      {(t[`cobertura_${tech}`] === "SI" || t[`${tech}`] === "1") ?
                        <span className="text-green-400">Si</span> :
                        <span className="text-gray-600">—</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState text="No se encontraron datos de cobertura telecomunicaciones" />
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-500">{label}</span>
      <span className="text-gray-300 font-mono">{value}</span>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="py-8 text-center text-gray-500 text-sm">{text}</div>
  );
}
