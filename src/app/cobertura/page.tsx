"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import type { MunicipioIGAC, CoverageStats } from "@/types";
import {
  computeCoverageStats,
  computeDepartmentCoverage,
  computeVigenciaDistribution,
  computePDETStats,
  computeGestorDistribution,
  ESTADO_COLORS,
  ESTADO_LABELS,
  formatCOP,
} from "@/lib/coverage";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import {
  ArrowLeft,
  Building2,
  MapPin,
  DollarSign,
  CheckCircle2,
  Filter,
  AlertTriangle,
  BarChart3,
  PieChart as PieChartIcon,
  Calendar,
  Users,
  Loader2,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types for chart data                                               */
/* ------------------------------------------------------------------ */

interface PieSlice {
  name: string;
  label: string;
  value: number;
  color: string;
}

interface DeptBar {
  departamento: string;
  porcentaje: number;
  actualizado: number;
  total: number;
}

interface VigenciaBar {
  year: string;
  count: number;
}

interface GestorBar {
  gestor: string;
  count: number;
}

/* ------------------------------------------------------------------ */
/*  Custom Recharts tooltip (dark theme)                               */
/* ------------------------------------------------------------------ */

function DarkTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number; name?: string; payload?: Record<string, unknown> }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 shadow-xl text-sm">
      {label && <p className="text-gray-400 mb-1">{label}</p>}
      {payload.map((entry, i) => (
        <p key={i} className="text-white font-medium">
          {entry.name ? `${entry.name}: ` : ""}
          {typeof entry.value === "number" ? entry.value.toLocaleString() : entry.value}
        </p>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Stat card component                                                */
/* ------------------------------------------------------------------ */

function StatCard({
  icon: Icon,
  label,
  value,
  subtitle,
  accent = "text-emerald-400",
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  subtitle?: string;
  accent?: string;
}) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-gray-700 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2 rounded-lg bg-gray-800 ${accent}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="text-sm text-gray-400 mt-1">{label}</p>
      {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Section wrapper                                                    */
/* ------------------------------------------------------------------ */

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-gray-900 border border-gray-800 rounded-xl p-6">
      <div className="flex items-center gap-2 mb-5">
        <Icon className="w-5 h-5 text-emerald-400" />
        <h2 className="text-lg font-semibold text-white">{title}</h2>
      </div>
      {children}
    </section>
  );
}

/* ================================================================== */
/*  Main page                                                          */
/* ================================================================== */

export default function CoberturaPage() {
  const [municipios, setMunicipios] = useState<MunicipioIGAC[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [selectedDept, setSelectedDept] = useState<string>("TODOS");
  const [pdetOnly, setPdetOnly] = useState(false);
  const [selectedCategoria, setSelectedCategoria] = useState<string>("TODAS");

  /* ---- Fetch data ------------------------------------------------ */

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch("/api/municipios");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: MunicipioIGAC[] = await res.json();
        setMunicipios(data);
      } catch (err) {
        console.error("Error fetching municipios:", err);
        setError("No se pudieron cargar los datos de municipios.");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  /* ---- Derived: available filter options ------------------------- */

  const departamentos = useMemo(() => {
    const set = new Set(municipios.map((m) => m.departamento).filter(Boolean));
    return Array.from(set).sort();
  }, [municipios]);

  const categorias = useMemo(() => {
    const set = new Set(
      municipios
        .map((m) => m.categoriaMunicipal)
        .filter((c): c is string => c !== null && c !== "")
    );
    return Array.from(set).sort();
  }, [municipios]);

  /* ---- Filtered data --------------------------------------------- */

  const filtered = useMemo(() => {
    let result = municipios;

    if (selectedDept !== "TODOS") {
      result = result.filter((m) => m.departamento === selectedDept);
    }

    if (pdetOnly) {
      result = result.filter(
        (m) => m.pdet && m.pdet !== "NO" && m.pdet !== ""
      );
    }

    if (selectedCategoria !== "TODAS") {
      result = result.filter(
        (m) => m.categoriaMunicipal === selectedCategoria
      );
    }

    return result;
  }, [municipios, selectedDept, pdetOnly, selectedCategoria]);

  /* ---- Computed stats -------------------------------------------- */

  const stats: CoverageStats | null = useMemo(
    () => (filtered.length > 0 ? computeCoverageStats(filtered) : null),
    [filtered]
  );

  const totalPredios = useMemo(
    () => filtered.reduce((acc, m) => acc + (m.totalPredios ?? 0), 0),
    [filtered]
  );

  const totalAvaluo = useMemo(
    () =>
      filtered.reduce(
        (acc, m) => acc + (m.avaluoRural ?? 0) + (m.avaluoUrbano ?? 0),
        0
      ),
    [filtered]
  );

  const pctUpdated = useMemo(() => {
    if (!stats || stats.total === 0) return 0;
    return Math.round(
      ((stats.actualizado + stats.actualizadoParcial) / stats.total) * 100
    );
  }, [stats]);

  /* ---- Chart data: Pie ------------------------------------------ */

  const pieData: PieSlice[] = useMemo(() => {
    if (!stats) return [];
    const entries: Array<{ key: keyof CoverageStats; estado: string }> = [
      { key: "actualizado", estado: "ACTUALIZADO" },
      { key: "actualizadoParcial", estado: "ACTUALIZADO PARCIAL" },
      { key: "desactualizado", estado: "DESACTUALIZADO" },
      { key: "porFormar", estado: "POR FORMAR" },
    ];
    return entries
      .filter((e) => stats[e.key] > 0)
      .map((e) => ({
        name: e.estado,
        label: ESTADO_LABELS[e.estado as keyof typeof ESTADO_LABELS],
        value: stats[e.key] as number,
        color: ESTADO_COLORS[e.estado as keyof typeof ESTADO_COLORS],
      }));
  }, [stats]);

  /* ---- Chart data: department bars ------------------------------- */

  const deptData: DeptBar[] = useMemo(() => {
    const coverage = computeDepartmentCoverage(filtered);
    return coverage.map((d) => ({
      departamento:
        d.departamento.length > 14
          ? d.departamento.slice(0, 12) + "..."
          : d.departamento,
      porcentaje: d.porcentajeActualizado,
      actualizado: d.stats.actualizado + d.stats.actualizadoParcial,
      total: d.stats.total,
    }));
  }, [filtered]);

  /* ---- Chart data: vigencia bars --------------------------------- */

  const vigenciaData: VigenciaBar[] = useMemo(() => {
    const dist = computeVigenciaDistribution(filtered);
    return Object.entries(dist)
      .filter(([year]) => year !== "Sin vigencia")
      .map(([year, count]) => ({ year, count }))
      .sort((a, b) => a.year.localeCompare(b.year));
  }, [filtered]);

  const sinVigencia = useMemo(() => {
    const dist = computeVigenciaDistribution(filtered);
    return dist["Sin vigencia"] ?? 0;
  }, [filtered]);

  /* ---- Chart data: gestor bars ----------------------------------- */

  const gestorData: GestorBar[] = useMemo(() => {
    const dist = computeGestorDistribution(filtered);
    return Object.entries(dist)
      .map(([gestor, count]) => ({
        gestor: gestor.length > 20 ? gestor.slice(0, 18) + "..." : gestor,
        count,
      }))
      .sort((a, b) => b.count - a.count);
  }, [filtered]);

  /* ---- "POR FORMAR" municipalities grouped by dept --------------- */

  const porFormarByDept = useMemo(() => {
    const porFormar = filtered.filter(
      (m) => m.estadoRural === "POR FORMAR"
    );
    const grouped = new Map<string, MunicipioIGAC[]>();
    for (const m of porFormar) {
      const dept = m.departamento || "Sin departamento";
      if (!grouped.has(dept)) grouped.set(dept, []);
      grouped.get(dept)!.push(m);
    }
    return Array.from(grouped.entries()).sort(
      (a, b) => b[1].length - a[1].length
    );
  }, [filtered]);

  /* ---- PDET stats ------------------------------------------------ */

  const pdetStats = useMemo(() => computePDETStats(filtered), [filtered]);

  /* ================================================================ */
  /*  RENDER                                                           */
  /* ================================================================ */

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-emerald-400 animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Cargando datos de cobertura...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-8 max-w-md text-center">
          <AlertTriangle className="w-8 h-8 text-red-400 mx-auto mb-3" />
          <p className="text-red-300">{error}</p>
          <Link
            href="/"
            className="inline-block mt-4 text-sm text-emerald-400 hover:underline"
          >
            Volver al inicio
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* ---- Header ---- */}
      <header className="sticky top-0 z-30 bg-gray-950/90 backdrop-blur-sm border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="p-2 rounded-lg hover:bg-gray-800 transition-colors text-gray-400 hover:text-white"
              title="Volver al mapa"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-xl font-bold text-white flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-emerald-400" />
                Cobertura Catastral
              </h1>
              <p className="text-sm text-gray-500">
                Analisis del estado cartografico municipal de Colombia
              </p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-xs text-gray-500">
            <MapPin className="w-3.5 h-3.5" />
            {municipios.length.toLocaleString()} municipios registrados
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* ---- Filters ---- */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-4 h-4 text-gray-400" />
            <span className="text-sm font-medium text-gray-300">Filtros</span>
            {(selectedDept !== "TODOS" || pdetOnly || selectedCategoria !== "TODAS") && (
              <button
                onClick={() => {
                  setSelectedDept("TODOS");
                  setPdetOnly(false);
                  setSelectedCategoria("TODAS");
                }}
                className="ml-auto text-xs text-emerald-400 hover:underline"
              >
                Limpiar filtros
              </button>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-4">
            {/* Department select */}
            <div className="flex flex-col gap-1">
              <label
                htmlFor="dept-select"
                className="text-xs text-gray-500"
              >
                Departamento
              </label>
              <select
                id="dept-select"
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
                className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent min-w-[200px]"
              >
                <option value="TODOS">Todos los departamentos</option>
                {departamentos.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            {/* Category select */}
            <div className="flex flex-col gap-1">
              <label
                htmlFor="cat-select"
                className="text-xs text-gray-500"
              >
                Categoria municipal
              </label>
              <select
                id="cat-select"
                value={selectedCategoria}
                onChange={(e) => setSelectedCategoria(e.target.value)}
                className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent min-w-[180px]"
              >
                <option value="TODAS">Todas las categorias</option>
                {categorias.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* PDET toggle */}
            <div className="flex flex-col gap-1">
              <span className="text-xs text-gray-500">PDET</span>
              <button
                onClick={() => setPdetOnly(!pdetOnly)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors border ${
                  pdetOnly
                    ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300"
                    : "bg-gray-800 border-gray-700 text-gray-400 hover:text-white hover:border-gray-600"
                }`}
              >
                {pdetOnly ? "PDET activo" : "Todos"}
              </button>
            </div>

            {/* Active filter count */}
            <div className="ml-auto flex items-center gap-2">
              <span className="text-sm text-gray-500">
                Mostrando{" "}
                <span className="text-white font-semibold">
                  {filtered.length.toLocaleString()}
                </span>{" "}
                municipios
              </span>
            </div>
          </div>
        </div>

        {/* ---- Stats cards ---- */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={Building2}
            label="Total municipios"
            value={filtered.length.toLocaleString()}
            subtitle={
              pdetOnly
                ? `${pdetStats.pdet.count} municipios PDET`
                : undefined
            }
            accent="text-blue-400"
          />
          <StatCard
            icon={MapPin}
            label="Total predios"
            value={totalPredios.toLocaleString()}
            subtitle="Rurales + urbanos"
            accent="text-violet-400"
          />
          <StatCard
            icon={DollarSign}
            label="Avaluo total"
            value={formatCOP(totalAvaluo)}
            subtitle="COP (rural + urbano)"
            accent="text-amber-400"
          />
          <StatCard
            icon={CheckCircle2}
            label="Cobertura actualizada"
            value={`${pctUpdated}%`}
            subtitle={
              stats
                ? `${stats.actualizado + stats.actualizadoParcial} de ${stats.total} municipios`
                : undefined
            }
            accent="text-emerald-400"
          />
        </div>

        {/* ---- Charts grid ---- */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pie: estado rural distribution */}
          <Section icon={PieChartIcon} title="Estado rural catastral">
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="w-full md:w-1/2 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="label"
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={90}
                      paddingAngle={2}
                      stroke="none"
                    >
                      {pieData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<DarkTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="w-full md:w-1/2 space-y-3">
                {pieData.map((entry) => (
                  <div key={entry.name} className="flex items-center gap-3">
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: entry.color }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-sm text-gray-300 truncate">
                          {entry.label}
                        </span>
                        <span className="text-sm font-semibold text-white tabular-nums">
                          {entry.value.toLocaleString()}
                        </span>
                      </div>
                      <div className="mt-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${stats ? (entry.value / stats.total) * 100 : 0}%`,
                            backgroundColor: entry.color,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Section>

          {/* Bar: gestor catastral */}
          <Section icon={Users} title="Gestor catastral">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={gestorData.slice(0, 15)}
                  layout="vertical"
                  margin={{ top: 0, right: 20, bottom: 0, left: 10 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#1f2937"
                    horizontal={false}
                  />
                  <XAxis
                    type="number"
                    tick={{ fill: "#9ca3af", fontSize: 12 }}
                    axisLine={{ stroke: "#374151" }}
                    tickLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="gestor"
                    width={130}
                    tick={{ fill: "#d1d5db", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<DarkTooltip />} />
                  <Bar
                    dataKey="count"
                    name="Municipios"
                    fill="#22c55e"
                    radius={[0, 4, 4, 0]}
                    maxBarSize={24}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Section>

          {/* Bar: department coverage ranking */}
          <Section icon={BarChart3} title="Cobertura por departamento">
            <p className="text-xs text-gray-500 mb-3">
              Porcentaje de municipios actualizados (total o parcialmente)
            </p>
            <div className="h-[500px] overflow-y-auto pr-1">
              <div style={{ height: Math.max(deptData.length * 26, 300) }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={deptData}
                    layout="vertical"
                    margin={{ top: 0, right: 30, bottom: 0, left: 10 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#1f2937"
                      horizontal={false}
                    />
                    <XAxis
                      type="number"
                      domain={[0, 100]}
                      tick={{ fill: "#9ca3af", fontSize: 11 }}
                      axisLine={{ stroke: "#374151" }}
                      tickLine={false}
                      tickFormatter={(v: number) => `${v}%`}
                    />
                    <YAxis
                      type="category"
                      dataKey="departamento"
                      width={110}
                      tick={{ fill: "#d1d5db", fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip content={<DarkTooltip />} />
                    <Bar
                      dataKey="porcentaje"
                      name="% Actualizado"
                      fill="#3b82f6"
                      radius={[0, 4, 4, 0]}
                      maxBarSize={18}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </Section>

          {/* Bar: vigencia distribution */}
          <Section icon={Calendar} title="Distribucion por vigencia">
            <p className="text-xs text-gray-500 mb-3">
              Ano de ultima actualizacion catastral rural
              {sinVigencia > 0 && (
                <span className="text-amber-400 ml-2">
                  ({sinVigencia} sin vigencia registrada)
                </span>
              )}
            </p>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={vigenciaData}
                  margin={{ top: 10, right: 20, bottom: 20, left: 10 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#1f2937"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="year"
                    tick={{ fill: "#9ca3af", fontSize: 10 }}
                    axisLine={{ stroke: "#374151" }}
                    tickLine={false}
                    interval={Math.max(0, Math.floor(vigenciaData.length / 12))}
                    angle={-45}
                    textAnchor="end"
                    height={50}
                  />
                  <YAxis
                    tick={{ fill: "#9ca3af", fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<DarkTooltip />} />
                  <Bar
                    dataKey="count"
                    name="Municipios"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={30}
                  >
                    {vigenciaData.map((entry) => {
                      const yr = parseInt(entry.year, 10);
                      let color = "#6b7280";
                      if (yr >= 2020) color = "#22c55e";
                      else if (yr >= 2010) color = "#3b82f6";
                      else if (yr >= 2000) color = "#eab308";
                      else if (yr >= 1990) color = "#f97316";
                      return <Cell key={entry.year} fill={color} />;
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            {/* Vigencia legend */}
            <div className="flex flex-wrap gap-4 mt-3 text-xs text-gray-400">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#f97316]" />
                1990s
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#eab308]" />
                2000s
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#3b82f6]" />
                2010s
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#22c55e]" />
                2020s
              </span>
            </div>
          </Section>
        </div>

        {/* ---- PDET comparison ---- */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
              Municipios PDET vs No-PDET
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-800/50 rounded-lg p-4">
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">
                  PDET
                </p>
                <p className="text-2xl font-bold text-amber-400">
                  {pdetStats.pdet.count}
                </p>
                <div className="mt-2 space-y-1 text-xs">
                  <div className="flex justify-between text-gray-400">
                    <span>Actualizado</span>
                    <span className="text-white">
                      {pdetStats.pdet.stats.actualizado}
                    </span>
                  </div>
                  <div className="flex justify-between text-gray-400">
                    <span>Parcial</span>
                    <span className="text-white">
                      {pdetStats.pdet.stats.actualizadoParcial}
                    </span>
                  </div>
                  <div className="flex justify-between text-gray-400">
                    <span>Desactualizado</span>
                    <span className="text-white">
                      {pdetStats.pdet.stats.desactualizado}
                    </span>
                  </div>
                  <div className="flex justify-between text-gray-400">
                    <span>Por formar</span>
                    <span className="text-white">
                      {pdetStats.pdet.stats.porFormar}
                    </span>
                  </div>
                </div>
                {pdetStats.pdet.count > 0 && (
                  <div className="mt-3">
                    <div className="h-2 bg-gray-700 rounded-full overflow-hidden flex">
                      <div
                        className="h-full"
                        style={{
                          width: `${(pdetStats.pdet.stats.actualizado / pdetStats.pdet.count) * 100}%`,
                          backgroundColor: ESTADO_COLORS.ACTUALIZADO,
                        }}
                      />
                      <div
                        className="h-full"
                        style={{
                          width: `${(pdetStats.pdet.stats.actualizadoParcial / pdetStats.pdet.count) * 100}%`,
                          backgroundColor: ESTADO_COLORS["ACTUALIZADO PARCIAL"],
                        }}
                      />
                      <div
                        className="h-full"
                        style={{
                          width: `${(pdetStats.pdet.stats.desactualizado / pdetStats.pdet.count) * 100}%`,
                          backgroundColor: ESTADO_COLORS.DESACTUALIZADO,
                        }}
                      />
                      <div
                        className="h-full"
                        style={{
                          width: `${(pdetStats.pdet.stats.porFormar / pdetStats.pdet.count) * 100}%`,
                          backgroundColor: ESTADO_COLORS["POR FORMAR"],
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
              <div className="bg-gray-800/50 rounded-lg p-4">
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">
                  No PDET
                </p>
                <p className="text-2xl font-bold text-blue-400">
                  {pdetStats.noPdet.count}
                </p>
                <div className="mt-2 space-y-1 text-xs">
                  <div className="flex justify-between text-gray-400">
                    <span>Actualizado</span>
                    <span className="text-white">
                      {pdetStats.noPdet.stats.actualizado}
                    </span>
                  </div>
                  <div className="flex justify-between text-gray-400">
                    <span>Parcial</span>
                    <span className="text-white">
                      {pdetStats.noPdet.stats.actualizadoParcial}
                    </span>
                  </div>
                  <div className="flex justify-between text-gray-400">
                    <span>Desactualizado</span>
                    <span className="text-white">
                      {pdetStats.noPdet.stats.desactualizado}
                    </span>
                  </div>
                  <div className="flex justify-between text-gray-400">
                    <span>Por formar</span>
                    <span className="text-white">
                      {pdetStats.noPdet.stats.porFormar}
                    </span>
                  </div>
                </div>
                {pdetStats.noPdet.count > 0 && (
                  <div className="mt-3">
                    <div className="h-2 bg-gray-700 rounded-full overflow-hidden flex">
                      <div
                        className="h-full"
                        style={{
                          width: `${(pdetStats.noPdet.stats.actualizado / pdetStats.noPdet.count) * 100}%`,
                          backgroundColor: ESTADO_COLORS.ACTUALIZADO,
                        }}
                      />
                      <div
                        className="h-full"
                        style={{
                          width: `${(pdetStats.noPdet.stats.actualizadoParcial / pdetStats.noPdet.count) * 100}%`,
                          backgroundColor: ESTADO_COLORS["ACTUALIZADO PARCIAL"],
                        }}
                      />
                      <div
                        className="h-full"
                        style={{
                          width: `${(pdetStats.noPdet.stats.desactualizado / pdetStats.noPdet.count) * 100}%`,
                          backgroundColor: ESTADO_COLORS.DESACTUALIZADO,
                        }}
                      />
                      <div
                        className="h-full"
                        style={{
                          width: `${(pdetStats.noPdet.stats.porFormar / pdetStats.noPdet.count) * 100}%`,
                          backgroundColor: ESTADO_COLORS["POR FORMAR"],
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Quick summary card */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">
              Resumen ejecutivo
            </h3>
            <div className="space-y-3 text-sm text-gray-300">
              {stats && (
                <>
                  <p>
                    De los{" "}
                    <span className="text-white font-semibold">
                      {stats.total.toLocaleString()}
                    </span>{" "}
                    municipios analizados, el{" "}
                    <span className="text-emerald-400 font-semibold">
                      {pctUpdated}%
                    </span>{" "}
                    cuenta con cartografia catastral rural actualizada o
                    parcialmente actualizada.
                  </p>
                  {stats.porFormar > 0 && (
                    <p>
                      <span className="text-red-400 font-semibold">
                        {stats.porFormar}
                      </span>{" "}
                      municipios se encuentran en estado{" "}
                      <span className="text-red-400">&quot;Por Formar&quot;</span>,
                      sin cartografia catastral vigente.
                    </p>
                  )}
                  {stats.desactualizado > 0 && (
                    <p>
                      <span className="text-orange-400 font-semibold">
                        {stats.desactualizado}
                      </span>{" "}
                      municipios tienen cartografia desactualizada y requieren
                      intervencion prioritaria.
                    </p>
                  )}
                  <p className="text-gray-500 text-xs mt-2">
                    Datos basados en registros IGAC. Avaluo total:{" "}
                    <span className="text-white">{formatCOP(totalAvaluo)}</span>{" "}
                    COP.
                  </p>
                </>
              )}
            </div>
          </div>
        </div>

        {/* ---- POR FORMAR table ---- */}
        {porFormarByDept.length > 0 && (
          <Section icon={AlertTriangle} title="Municipios sin cartografia catastral (Por Formar)">
            <p className="text-sm text-gray-400 mb-4">
              {filtered.filter((m) => m.estadoRural === "POR FORMAR").length}{" "}
              municipios agrupados por departamento que no cuentan con
              formacion catastral rural.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800 text-left">
                    <th className="pb-3 pr-4 text-gray-400 font-medium">
                      Departamento
                    </th>
                    <th className="pb-3 pr-4 text-gray-400 font-medium">
                      Municipio
                    </th>
                    <th className="pb-3 pr-4 text-gray-400 font-medium text-right">
                      Predios
                    </th>
                    <th className="pb-3 pr-4 text-gray-400 font-medium">
                      Gestor
                    </th>
                    <th className="pb-3 text-gray-400 font-medium">
                      PDET
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {porFormarByDept.map(([dept, munis]) =>
                    munis.map((m, idx) => (
                      <tr
                        key={m.codigo}
                        className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors"
                      >
                        <td className="py-2.5 pr-4">
                          {idx === 0 ? (
                            <span className="text-white font-medium">
                              {dept}
                              <span className="ml-2 text-xs text-gray-500">
                                ({munis.length})
                              </span>
                            </span>
                          ) : null}
                        </td>
                        <td className="py-2.5 pr-4">
                          <Link
                            href={`/municipio/${m.codigo}`}
                            className="text-emerald-400 hover:underline"
                          >
                            {m.nombre}
                          </Link>
                          <span className="ml-2 text-xs text-gray-600">
                            {m.codigo}
                          </span>
                        </td>
                        <td className="py-2.5 pr-4 text-right text-gray-300 tabular-nums">
                          {m.totalPredios
                            ? m.totalPredios.toLocaleString()
                            : "-"}
                        </td>
                        <td className="py-2.5 pr-4 text-gray-400 text-xs">
                          {m.gestorCatastral ?? "-"}
                        </td>
                        <td className="py-2.5">
                          {m.pdet && m.pdet !== "NO" && m.pdet !== "" ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-amber-500/10 text-amber-400 border border-amber-500/20">
                              PDET
                            </span>
                          ) : (
                            <span className="text-gray-600 text-xs">-</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Section>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-800 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex items-center justify-between text-xs text-gray-600">
          <span>Fuente: IGAC — Instituto Geografico Agustin Codazzi</span>
          <Link
            href="/"
            className="text-emerald-400 hover:underline flex items-center gap-1"
          >
            <ArrowLeft className="w-3 h-3" />
            Volver al mapa
          </Link>
        </div>
      </footer>
    </div>
  );
}
