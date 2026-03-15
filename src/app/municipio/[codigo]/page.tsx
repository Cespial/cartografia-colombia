"use client";

import { useState, useEffect, use } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import type { MunicipioIGAC } from "@/types";
import { ESTADO_COLORS, ESTADO_LABELS, formatCOP } from "@/lib/coverage";
import {
  ArrowLeft, MapPin, Mountain, Ruler, Calendar, AlertTriangle,
  CheckCircle, Clock, Building2, Landmark, Wheat, ShieldAlert,
  Signal, GraduationCap, HeartPulse, Loader2, Banknote, Globe2,
} from "lucide-react";

const MunicipalMap = dynamic(() => import("@/components/map/MunicipalMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[500px] bg-gray-900 rounded-xl flex items-center justify-center">
      <div className="text-gray-500">Cargando mapa...</div>
    </div>
  ),
});

type Tab = "general" | "educacion" | "salud" | "seguridad" | "agricultura" | "infraestructura" | "conflicto" | "clima" | "emergencias" | "economia" | "territorio";

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "general", label: "General", icon: Building2 },
  { id: "educacion", label: "Educación", icon: GraduationCap },
  { id: "salud", label: "Salud", icon: HeartPulse },
  { id: "seguridad", label: "Seguridad", icon: ShieldAlert },
  { id: "agricultura", label: "Agricultura", icon: Wheat },
  { id: "infraestructura", label: "Conectividad", icon: Signal },
  { id: "emergencias", label: "Emergencias", icon: AlertTriangle },
  { id: "conflicto", label: "Conflicto", icon: Landmark },
  { id: "economia", label: "Economía", icon: Banknote },
  { id: "territorio", label: "Territorio", icon: Globe2 },
  { id: "clima", label: "Clima", icon: Mountain },
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

// Tabs that trigger lazy-fetch of seguridad sub-endpoint
const SEGURIDAD_TABS: Tab[] = ["seguridad", "conflicto"];
// Tabs that trigger lazy-fetch of economia sub-endpoint
const ECONOMIA_TABS: Tab[] = ["economia", "territorio", "salud", "infraestructura"];

export default function MunicipioPage({ params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = use(params);
  const [municipio, setMunicipio] = useState<MunicipioIGAC | null>(null);
  const [allMunicipios, setAllMunicipios] = useState<MunicipioIGAC[]>([]);
  const [municipioGeoJSON, setMunicipioGeoJSON] = useState<GeoJSON.FeatureCollection | null>(null);
  const [enrichment, setEnrichment] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [enrichLoading, setEnrichLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("general");

  // Lazy-loaded sub-endpoint data
  const [seguridadExtra, setSeguridadExtra] = useState<any>(null);
  const [seguridadExtraLoading, setSeguridadExtraLoading] = useState(false);
  const [economiaData, setEconomiaData] = useState<any>(null);
  const [economiaLoading, setEconomiaLoading] = useState(false);

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

  // Fetch enrichment data from datos.gov.co (pass nombre & departamento for IPS/IDEAM)
  useEffect(() => {
    if (!codigo || !municipio) return;
    setEnrichLoading(true);
    const params = new URLSearchParams({
      nombre: municipio.nombre,
      departamento: municipio.departamento,
    });
    fetch(`/api/municipios/${codigo}?${params}`)
      .then((r) => r.json())
      .then(setEnrichment)
      .catch(() => setEnrichment(null))
      .finally(() => setEnrichLoading(false));
  }, [codigo, municipio]);

  // Lazy-fetch: seguridad sub-endpoint
  useEffect(() => {
    if (!SEGURIDAD_TABS.includes(activeTab) || seguridadExtra || seguridadExtraLoading || !municipio) return;
    setSeguridadExtraLoading(true);
    fetch(`/api/municipios/${codigo}/seguridad`)
      .then((r) => r.json())
      .then(setSeguridadExtra)
      .catch(() => setSeguridadExtra(null))
      .finally(() => setSeguridadExtraLoading(false));
  }, [activeTab, codigo, seguridadExtra, seguridadExtraLoading, municipio]);

  // Lazy-fetch: economia sub-endpoint
  useEffect(() => {
    if (!ECONOMIA_TABS.includes(activeTab) || economiaData || economiaLoading || !municipio) return;
    setEconomiaLoading(true);
    const params = new URLSearchParams({ nombre: municipio.nombre });
    fetch(`/api/municipios/${codigo}/economia?${params}`)
      .then((r) => r.json())
      .then(setEconomiaData)
      .catch(() => setEconomiaData(null))
      .finally(() => setEconomiaLoading(false));
  }, [activeTab, codigo, economiaData, economiaLoading, municipio]);

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

  // Is the current tab's lazy data still loading?
  const tabLoading =
    (SEGURIDAD_TABS.includes(activeTab) && seguridadExtraLoading) ||
    (ECONOMIA_TABS.includes(activeTab) && economiaLoading);

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <header className="bg-gray-900/95 backdrop-blur-sm border-b border-gray-800 px-3 sm:px-6 py-3 sm:py-4">
        <div className="max-w-7xl mx-auto flex items-center gap-3">
          <Link href="/" className="p-1.5 sm:p-2 hover:bg-gray-800 rounded-lg transition-colors flex-shrink-0">
            <ArrowLeft className="w-5 h-5 text-gray-400" />
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-base sm:text-xl font-bold text-white truncate">{municipio.nombre}</h1>
            <Link href={`/departamento/${encodeURIComponent(municipio.departamento)}`} className="text-xs sm:text-sm text-gray-500 hover:text-gray-300 transition-colors">
              {municipio.departamento}
            </Link>
          </div>
          <div className="flex items-center gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs sm:text-sm font-medium flex-shrink-0"
            style={{
              backgroundColor: ESTADO_COLORS[municipio.estadoRural] + "20",
              color: ESTADO_COLORS[municipio.estadoRural],
              border: `1px solid ${ESTADO_COLORS[municipio.estadoRural]}40`,
            }}>
            <StatusIcon estado={municipio.estadoRural} />
            <span className="hidden sm:inline">{ESTADO_LABELS[municipio.estadoRural]}</span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
        {/* Stats cards — responsive: 2 cols mobile, 3 tablet, 6 desktop */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
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
            <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl overflow-hidden h-[280px] sm:h-[400px] lg:h-[500px]">
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
                {municipio.pdet === "1" && (
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
          <div className="flex gap-0.5 sm:gap-1 p-1 bg-gray-800/50 rounded-lg overflow-x-auto scrollbar-hide">
            {TABS.map((tab) => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1 sm:gap-2 px-2.5 sm:px-4 py-2 sm:py-2.5 rounded-md text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
                  activeTab === tab.id ? "bg-gray-700 text-white" : "text-gray-500 hover:text-gray-300"
                }`}>
                <tab.icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>

          <div className="mt-4">
            {enrichLoading && !SEGURIDAD_TABS.includes(activeTab) && !ECONOMIA_TABS.includes(activeTab) ? (
              <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-8 flex items-center justify-center">
                <Loader2 className="w-6 h-6 text-gray-500 animate-spin" />
                <span className="ml-3 text-gray-500">Consultando datos.gov.co...</span>
              </div>
            ) : tabLoading ? (
              <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-8 flex items-center justify-center">
                <Loader2 className="w-6 h-6 text-gray-500 animate-spin" />
                <span className="ml-3 text-gray-500">Cargando datos adicionales...</span>
              </div>
            ) : (
              <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-5">
                {activeTab === "general" && <GeneralTab municipio={municipio} enrichment={enrichment} />}
                {activeTab === "educacion" && <EducacionTab enrichment={enrichment} />}
                {activeTab === "salud" && <SaludTab enrichment={enrichment} economiaData={economiaData} />}
                {activeTab === "seguridad" && <SeguridadTab enrichment={enrichment} seguridadExtra={seguridadExtra} />}
                {activeTab === "agricultura" && <AgriculturaTab enrichment={enrichment} />}
                {activeTab === "infraestructura" && <InfraestructuraTab enrichment={enrichment} economiaData={economiaData} />}
                {activeTab === "emergencias" && <EmergenciasTab enrichment={enrichment} />}
                {activeTab === "conflicto" && <ConflictoTab enrichment={enrichment} seguridadExtra={seguridadExtra} />}
                {activeTab === "economia" && <EconomiaTab economiaData={economiaData} />}
                {activeTab === "territorio" && <TerritorioTab economiaData={economiaData} />}
                {activeTab === "clima" && <ClimaTab enrichment={enrichment} />}
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

function SaludTab({ enrichment, economiaData }: { enrichment: any; economiaData: any }) {
  const salud = enrichment?.salud;
  const bduaContrib = economiaData?.bduaContributivo ?? [];
  const bduaSubs = economiaData?.bduaSubsidiado ?? [];
  const hasBDUA = bduaContrib.length > 0 || bduaSubs.length > 0;

  if ((!salud || salud.totalIPS === 0) && !hasBDUA) return <EmptyState text="No se encontraron datos de salud para este municipio" />;
  return (
    <div className="space-y-6">
      <h3 className="font-semibold text-white text-lg">Salud</h3>
      <p className="text-xs text-gray-500">Fuente: MinSalud REPS + BDUA — datos.gov.co</p>

      {/* BDUA section */}
      {hasBDUA && (
        <div>
          <h4 className="text-sm font-medium text-emerald-400 mb-3">Población Asegurada (BDUA)</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {bduaContrib.length > 0 && (
              <div>
                <p className="text-xs text-gray-500 mb-2">Régimen Contributivo</p>
                <div className="space-y-1">
                  {bduaContrib.slice(0, 8).map((e: any, i: number) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span className="text-gray-400 truncate mr-2">{e.ent_nombre}</span>
                      <span className="text-white font-mono flex-shrink-0">{Number(e.total).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {bduaSubs.length > 0 && (
              <div>
                <p className="text-xs text-gray-500 mb-2">Régimen Subsidiado</p>
                <div className="space-y-1">
                  {bduaSubs.slice(0, 8).map((e: any, i: number) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span className="text-gray-400 truncate mr-2">{e.ent_nombre}</span>
                      <span className="text-white font-mono flex-shrink-0">{Number(e.total).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* IPS section */}
      {salud && salud.totalIPS > 0 && (
        <div>
          <h4 className="text-sm font-medium text-blue-400 mb-3">IPS Registradas ({salud.totalIPS})</h4>
          {Object.keys(salud.porNivel).length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {Object.entries(salud.porNivel).map(([nivel, count]) => (
                <span key={nivel} className="px-3 py-1 bg-gray-700/50 rounded-full text-sm text-gray-300">
                  {nivel === "null" || nivel === "None" ? "Sin nivel" : `Nivel ${nivel}`}: <span className="font-mono text-white">{count as number}</span>
                </span>
              ))}
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-gray-700">
                <th className="text-left py-2 text-gray-400">Nombre</th>
                <th className="text-center py-2 text-gray-400">Nivel</th>
                <th className="text-center py-2 text-gray-400">Carácter</th>
                <th className="text-center py-2 text-gray-400">Habilitado</th>
              </tr></thead>
              <tbody>
                {salud.establecimientos.map((ips: any, i: number) => (
                  <tr key={i} className="border-b border-gray-800">
                    <td className="py-2 text-gray-300 max-w-[300px] truncate">{ips.nombre}</td>
                    <td className="py-2 text-center text-gray-400">{ips.nivel ?? "—"}</td>
                    <td className="py-2 text-center text-gray-400">{ips.caracter ?? "—"}</td>
                    <td className="py-2 text-center">{ips.habilitado === "SI" ? <span className="text-green-400">Sí</span> : <span className="text-gray-600">No</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function SeguridadTab({ enrichment, seguridadExtra }: { enrichment: any; seguridadExtra: any }) {
  const homicidios = enrichment?.homicidios ?? [];
  const delitosSexuales = seguridadExtra?.delitosSexuales ?? [];
  const vif = seguridadExtra?.violenciaIntrafamiliar ?? [];
  const hurtos = seguridadExtra?.hurtos ?? [];
  const suicidios = seguridadExtra?.suicidios ?? [];

  const totalDelitos = Number(delitosSexuales[0]?.total ?? 0);
  const totalVIF = Number(vif[0]?.total ?? 0);
  const totalHurtos = Number(hurtos[0]?.total ?? 0);

  const hasAny = homicidios.length > 0 || totalDelitos > 0 || totalVIF > 0 || totalHurtos > 0 || suicidios.length > 0;
  if (!hasAny) return <EmptyState text="No se encontraron datos de seguridad para este municipio" />;

  return (
    <div className="space-y-6">
      <h3 className="font-semibold text-white text-lg">Seguridad</h3>
      <p className="text-xs text-gray-500">Fuente: Medicina Legal / Policía Nacional — datos.gov.co</p>

      {/* Summary cards */}
      {(totalDelitos > 0 || totalVIF > 0 || totalHurtos > 0) && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {totalDelitos > 0 && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
              <p className="text-xs text-red-400">Delitos sexuales (total)</p>
              <p className="text-2xl font-mono text-red-400">{totalDelitos.toLocaleString()}</p>
            </div>
          )}
          {totalVIF > 0 && (
            <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-3">
              <p className="text-xs text-orange-400">Violencia intrafamiliar (total)</p>
              <p className="text-2xl font-mono text-orange-400">{totalVIF.toLocaleString()}</p>
            </div>
          )}
          {totalHurtos > 0 && (
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
              <p className="text-xs text-yellow-400">Hurtos (total)</p>
              <p className="text-2xl font-mono text-yellow-400">{totalHurtos.toLocaleString()}</p>
            </div>
          )}
        </div>
      )}

      {/* Homicidios time series */}
      {homicidios.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-red-400 mb-2">Homicidios por año</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-gray-700">
                <th className="text-left py-2 text-gray-400">Año</th>
                <th className="text-right py-2 text-gray-400">Homicidios</th>
              </tr></thead>
              <tbody>
                {homicidios.map((h: any, i: number) => (
                  <tr key={i} className="border-b border-gray-800">
                    <td className="py-2 text-gray-300">{h.a_o_del_hecho ?? h.a_o}</td>
                    <td className="py-2 text-right font-mono text-white">{h.cantidad}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Suicidios time series */}
      {suicidios.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-purple-400 mb-2">Suicidios por año</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-gray-700">
                <th className="text-left py-2 text-gray-400">Año</th>
                <th className="text-right py-2 text-gray-400">Casos</th>
              </tr></thead>
              <tbody>
                {suicidios.map((s: any, i: number) => (
                  <tr key={i} className="border-b border-gray-800">
                    <td className="py-2 text-gray-300">{s.anio}</td>
                    <td className="py-2 text-right font-mono text-white">{s.cantidad}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
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

function InfraestructuraTab({ enrichment, economiaData }: { enrichment: any; economiaData: any }) {
  const telco = enrichment?.telecomunicaciones ?? [];
  const aeropuertos = economiaData?.aeropuertos ?? [];

  return (
    <div className="space-y-6">
      <h3 className="font-semibold text-white text-lg">Infraestructura y Conectividad</h3>
      <p className="text-xs text-gray-500">Fuente: MinTIC + Aerocivil — datos.gov.co</p>

      {/* Aeropuertos */}
      {aeropuertos.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-blue-400 mb-2">Aeropuertos</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-gray-700">
                <th className="text-left py-2 text-gray-400">Nombre</th>
                <th className="text-center py-2 text-gray-400">OACI</th>
                <th className="text-center py-2 text-gray-400">IATA</th>
                <th className="text-center py-2 text-gray-400">Operación</th>
                <th className="text-right py-2 text-gray-400">Elevación (m)</th>
              </tr></thead>
              <tbody>
                {aeropuertos.map((a: any, i: number) => (
                  <tr key={i} className="border-b border-gray-800">
                    <td className="py-2 text-gray-300">{a.nombre}</td>
                    <td className="py-2 text-center text-gray-400 font-mono">{a.oasi}</td>
                    <td className="py-2 text-center text-gray-400 font-mono">{a.iata?.toUpperCase()}</td>
                    <td className="py-2 text-center text-gray-400">{a.operacion}</td>
                    <td className="py-2 text-right font-mono text-white">{a.eleva_metros}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Telco */}
      {telco.length > 0 ? (
        <div>
          <h4 className="text-sm font-medium text-emerald-400 mb-2">Cobertura Telecomunicaciones</h4>
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
                    {[
                      { key: "cobertura_2g", label: "2G" },
                      { key: "cobertura_3g", label: "3G" },
                      { key: "cobertuta_4g", label: "4G" },
                      { key: "cobertura_lte", label: "LTE" },
                    ].map(({ key }) => (
                      <td key={key} className="py-2 text-center">
                        {(t[key] === "S" || t[key] === "SI") ?
                          <span className="text-green-400">Si</span> :
                          <span className="text-gray-600">—</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : aeropuertos.length === 0 ? (
        <EmptyState text="No se encontraron datos de infraestructura" />
      ) : null}
    </div>
  );
}

function EmergenciasTab({ enrichment }: { enrichment: any }) {
  const emergencias = enrichment?.emergencias ?? [];
  if (emergencias.length === 0) return <EmptyState text="No se encontraron emergencias registradas (UNGRD)" />;
  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-white text-lg">Emergencias ({emergencias.length})</h3>
      <p className="text-xs text-gray-500">Fuente: UNGRD — datos.gov.co</p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-gray-700">
            <th className="text-left py-2 text-gray-400">Fecha</th>
            <th className="text-left py-2 text-gray-400">Evento</th>
            <th className="text-right py-2 text-gray-400">Fallecidos</th>
            <th className="text-right py-2 text-gray-400">Heridos</th>
            <th className="text-right py-2 text-gray-400">Personas</th>
            <th className="text-right py-2 text-gray-400">Viviendas dest.</th>
          </tr></thead>
          <tbody>
            {emergencias.map((e: any, i: number) => (
              <tr key={i} className="border-b border-gray-800">
                <td className="py-2 text-gray-400">{e.fecha?.slice(0, 10) ?? "—"}</td>
                <td className="py-2 text-gray-300">{e.evento}</td>
                <td className="py-2 text-right font-mono text-white">{e.fallecidos || "—"}</td>
                <td className="py-2 text-right font-mono text-white">{e.heridos || "—"}</td>
                <td className="py-2 text-right font-mono text-white">{e.personas || "—"}</td>
                <td className="py-2 text-right font-mono text-white">{e.viviendasDestruidas || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ConflictoTab({ enrichment, seguridadExtra }: { enrichment: any; seguridadExtra: any }) {
  const conflicto = enrichment?.conflicto;
  const map = conflicto?.victimasMAP ?? [];
  const masacres = conflicto?.masacres ?? [];
  const ataques = seguridadExtra?.ataquesTerroristas ?? [];
  const desaparicion = seguridadExtra?.desaparicionForzada ?? [];

  if (map.length === 0 && masacres.length === 0 && ataques.length === 0 && desaparicion.length === 0) {
    return <EmptyState text="No se encontraron registros de conflicto armado para este municipio" />;
  }

  return (
    <div className="space-y-6">
      <h3 className="font-semibold text-white text-lg">Conflicto Armado</h3>
      <p className="text-xs text-gray-500">Fuente: SIEVCAC — datos.gov.co</p>

      {map.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-red-400 mb-2">Víctimas Minas Antipersonal (MAP/MUSE)</h4>
          <div className="flex flex-wrap gap-2">
            {map.map((m: any, i: number) => (
              <span key={i} className="px-3 py-1 bg-red-500/10 border border-red-500/20 rounded-full text-sm">
                <span className="text-gray-400">{m.a_o}:</span> <span className="text-red-400 font-mono">{m.cantidad}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {masacres.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-orange-400 mb-2">Masacres</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-gray-700">
                <th className="text-left py-2 text-gray-400">Año</th>
                <th className="text-right py-2 text-gray-400">Casos</th>
                <th className="text-right py-2 text-gray-400">Víctimas</th>
              </tr></thead>
              <tbody>
                {masacres.map((m: any, i: number) => (
                  <tr key={i} className="border-b border-gray-800">
                    <td className="py-2 text-gray-300">{m.a_o}</td>
                    <td className="py-2 text-right font-mono text-white">{m.casos}</td>
                    <td className="py-2 text-right font-mono text-orange-400">{m.victimas}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {ataques.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-yellow-400 mb-2">Ataques Terroristas</h4>
          <div className="flex flex-wrap gap-2">
            {ataques.map((a: any, i: number) => (
              <span key={i} className="px-3 py-1 bg-yellow-500/10 border border-yellow-500/20 rounded-full text-sm">
                <span className="text-gray-400">{a.a_o}:</span> <span className="text-yellow-400 font-mono">{a.cantidad}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {desaparicion.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-purple-400 mb-2">Desaparición Forzada</h4>
          <div className="flex flex-wrap gap-2">
            {desaparicion.map((d: any, i: number) => (
              <span key={i} className="px-3 py-1 bg-purple-500/10 border border-purple-500/20 rounded-full text-sm">
                <span className="text-gray-400">{d.a_o}:</span> <span className="text-purple-400 font-mono">{d.cantidad}</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function EconomiaTab({ economiaData }: { economiaData: any }) {
  const sgr = economiaData?.sgr ?? [];
  const mineria = economiaData?.mineria ?? [];

  if (sgr.length === 0 && mineria.length === 0) {
    return <EmptyState text="No se encontraron datos económicos para este municipio" />;
  }

  return (
    <div className="space-y-6">
      <h3 className="font-semibold text-white text-lg">Economía</h3>
      <p className="text-xs text-gray-500">Fuente: SGR + ANM — datos.gov.co</p>

      {/* SGR Projects */}
      {sgr.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-emerald-400 mb-2">Proyectos SGR ({sgr.length})</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-gray-700">
                <th className="text-left py-2 text-gray-400">Proyecto</th>
                <th className="text-center py-2 text-gray-400">Estado</th>
                <th className="text-center py-2 text-gray-400">Sector</th>
                <th className="text-right py-2 text-gray-400">Valor</th>
                <th className="text-right py-2 text-gray-400">Ejec. Física</th>
              </tr></thead>
              <tbody>
                {sgr.map((p: any, i: number) => (
                  <tr key={i} className="border-b border-gray-800">
                    <td className="py-2 text-gray-300 max-w-[300px] truncate">{p.nombre}</td>
                    <td className="py-2 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-xs ${
                        p.estado === "TERMINADO" ? "bg-green-500/10 text-green-400" :
                        p.estado === "EN EJECUCIÓN" ? "bg-blue-500/10 text-blue-400" :
                        "bg-gray-700 text-gray-400"
                      }`}>{p.estado}</span>
                    </td>
                    <td className="py-2 text-center text-gray-400 text-xs">{p.sector}</td>
                    <td className="py-2 text-right font-mono text-white">{formatCOP(p.valorTotal)}</td>
                    <td className="py-2 text-right font-mono text-gray-400">{p.ejecucionFisica}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Minería */}
      {mineria.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-yellow-400 mb-2">Producción Minera</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-gray-700">
                <th className="text-left py-2 text-gray-400">Mineral</th>
                <th className="text-right py-2 text-gray-400">Año</th>
                <th className="text-right py-2 text-gray-400">Volumen</th>
                <th className="text-right py-2 text-gray-400">Unidad</th>
                <th className="text-right py-2 text-gray-400">Regalías</th>
              </tr></thead>
              <tbody>
                {mineria.slice(0, 20).map((m: any, i: number) => (
                  <tr key={i} className="border-b border-gray-800">
                    <td className="py-2 text-gray-300">{m.mineral}</td>
                    <td className="py-2 text-right text-gray-400">{m.anio}</td>
                    <td className="py-2 text-right font-mono text-white">{Number(m.volumen ?? 0).toLocaleString()}</td>
                    <td className="py-2 text-right text-gray-400">{m.unidad}</td>
                    <td className="py-2 text-right font-mono text-emerald-400">{m.regalias ? formatCOP(Number(m.regalias)) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function TerritorioTab({ economiaData }: { economiaData: any }) {
  const nbi = economiaData?.nbi;
  const densidad = economiaData?.densidad;
  const generalidades = economiaData?.generalidades;
  const edSuperior = economiaData?.educacionSuperior ?? [];

  const hasAny = nbi || densidad || generalidades || edSuperior.length > 0;
  if (!hasAny) return <EmptyState text="No se encontraron datos territoriales para este municipio" />;

  return (
    <div className="space-y-6">
      <h3 className="font-semibold text-white text-lg">Territorio</h3>
      <p className="text-xs text-gray-500">Fuente: IGAC + MEN — datos.gov.co</p>

      {/* NBI + Densidad summary cards */}
      {(nbi || densidad) && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {nbi?.nbi != null && (
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
              <p className="text-xs text-blue-400">NBI (%)</p>
              <p className="text-2xl font-mono text-blue-400">{nbi.nbi.toFixed(1)}</p>
              {nbi.rango && <p className="text-xs text-gray-500 mt-1">{nbi.rango}</p>}
            </div>
          )}
          {densidad?.poblacion != null && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3">
              <p className="text-xs text-emerald-400">Población</p>
              <p className="text-2xl font-mono text-emerald-400">{densidad.poblacion.toLocaleString()}</p>
              {densidad.rangoArea && <p className="text-xs text-gray-500 mt-1">{densidad.rangoArea}</p>}
            </div>
          )}
        </div>
      )}

      {/* Generalidades */}
      {generalidades && (
        <div>
          <h4 className="text-sm font-medium text-gray-300 mb-2">Generalidades del Municipio</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {Object.entries(generalidades)
              .filter(([k]) => !k.startsWith("OBJECTID") && !k.startsWith("Shape") && !k.startsWith("MpCodigo"))
              .slice(0, 12)
              .map(([key, value]) => (
                <div key={key} className="bg-gray-700/30 rounded-lg p-3">
                  <p className="text-xs text-gray-500 truncate">{key.replace(/_/g, " ")}</p>
                  <p className="text-sm font-mono text-white">{value != null ? String(value) : "—"}</p>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Educación Superior */}
      {edSuperior.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-purple-400 mb-2">Educación Superior</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-gray-700">
                <th className="text-left py-2 text-gray-400">Programa</th>
                <th className="text-left py-2 text-gray-400">IES</th>
                <th className="text-right py-2 text-gray-400">Año</th>
                <th className="text-right py-2 text-gray-400">Matriculados</th>
              </tr></thead>
              <tbody>
                {edSuperior.slice(0, 20).map((e: any, i: number) => (
                  <tr key={i} className="border-b border-gray-800">
                    <td className="py-2 text-gray-300 max-w-[200px] truncate">{e.programa_acad_mico}</td>
                    <td className="py-2 text-gray-400 max-w-[200px] truncate">{e.instituci_n_de_educaci_n_superior_ies}</td>
                    <td className="py-2 text-right text-gray-400">{e.a_o}-{e.semestre}</td>
                    <td className="py-2 text-right font-mono text-white">{Number(e.matriculados).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function ClimaTab({ enrichment }: { enrichment: any }) {
  const clima = enrichment?.clima;
  const precip = clima?.precipitacion ?? [];
  const temp = clima?.temperatura ?? [];
  if (precip.length === 0 && temp.length === 0) return <EmptyState text="No se encontraron normales climatológicas IDEAM para este municipio" />;
  const meses = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  return (
    <div className="space-y-6">
      <h3 className="font-semibold text-white text-lg">Clima (Normales Climatológicas)</h3>
      <p className="text-xs text-gray-500">Fuente: IDEAM — datos.gov.co</p>
      {precip.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-blue-400 mb-2">Precipitación (mm)</h4>
          {precip.map((p: any, i: number) => (
            <div key={i} className="mb-3">
              <p className="text-xs text-gray-500 mb-1">{p.estacion} ({p.altitud}m)</p>
              <div className="flex gap-1">
                {meses.map((m) => {
                  const val = Number(p[m] ?? 0);
                  const maxVal = Math.max(...meses.map((mm) => Number(p[mm] ?? 0)), 1);
                  return (
                    <div key={m} className="flex-1 text-center">
                      <div className="h-16 flex items-end justify-center mb-1">
                        <div className="w-full bg-blue-500/60 rounded-t" style={{ height: `${(val / maxVal) * 100}%` }} />
                      </div>
                      <p className="text-[9px] text-gray-500">{m}</p>
                      <p className="text-[9px] font-mono text-gray-400">{Math.round(val)}</p>
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-gray-400 mt-1">Anual: <span className="font-mono text-blue-400">{p.anual} mm</span></p>
            </div>
          ))}
        </div>
      )}
      {temp.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-orange-400 mb-2">Temperatura Media (°C)</h4>
          {temp.map((t: any, i: number) => (
            <div key={i} className="mb-3">
              <p className="text-xs text-gray-500 mb-1">{t.estacion} ({t.altitud}m)</p>
              <div className="flex gap-2 flex-wrap">
                {meses.map((m) => (
                  <span key={m} className="px-2 py-1 bg-gray-700/50 rounded text-xs">
                    <span className="text-gray-500">{m}:</span> <span className="font-mono text-orange-300">{t[m]}°</span>
                  </span>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-1">Anual: <span className="font-mono text-orange-400">{t.anual}°C</span></p>
            </div>
          ))}
        </div>
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
