import { NextResponse } from "next/server";
import {
  fetchEducacion,
  fetchIPS,
  fetchHomicidios,
  fetchAgricultura,
  fetchCoberturaTelco,
  fetchEmergencias,
  fetchTurismo,
  fetchDesempenoMunicipal,
  fetchVictimasMAP,
  fetchMasacres,
  fetchClimaPrecipitacion,
  fetchClimaTemperatura,
} from "@/lib/datos-gov";

/**
 * GET /api/municipios/[codigo]?nombre=X&departamento=Y
 * Returns enriched data for a single municipality from datos.gov.co
 * nombre & departamento needed for IPS and IDEAM (name-based queries)
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ codigo: string }> }
) {
  const { codigo } = await params;
  const { searchParams } = new URL(req.url);
  const nombre = searchParams.get("nombre") ?? "";
  const departamento = searchParams.get("departamento") ?? "";

  try {
    const [
      educacionRaw,
      homicidiosRaw,
      agriculturaRaw,
      telcoRaw,
      turismoRaw,
      desempenoRaw,
      ipsRaw,
      emergenciasRaw,
      victimasMAPRaw,
      masacresRaw,
      precipitacionRaw,
      temperaturaRaw,
    ] = await Promise.allSettled([
      fetchEducacion(codigo),
      fetchHomicidios(codigo),
      fetchAgricultura(codigo),
      fetchCoberturaTelco(codigo),
      fetchTurismo(codigo),
      fetchDesempenoMunicipal(codigo),
      nombre && departamento ? fetchIPS(nombre, departamento) : Promise.resolve([]),
      fetchEmergencias(codigo),
      fetchVictimasMAP(codigo),
      fetchMasacres(codigo),
      nombre ? fetchClimaPrecipitacion(nombre) : Promise.resolve([]),
      nombre ? fetchClimaTemperatura(nombre) : Promise.resolve([]),
    ]);

    const val = <T>(r: PromiseSettledResult<T>, name: string): T | null => {
      if (r.status === "rejected") {
        console.error(`[${codigo}] ${name} failed:`, r.reason?.message ?? r.reason);
      }
      return r.status === "fulfilled" ? r.value : null;
    };

    const educacion = val(educacionRaw, "educacion") as Record<string, unknown>[] | null;
    const homicidios = val(homicidiosRaw, "homicidios") as Record<string, unknown>[] | null;
    const agricultura = val(agriculturaRaw, "agricultura") as Record<string, unknown>[] | null;
    const telco = val(telcoRaw, "telco") as Record<string, unknown>[] | null;
    const turismo = val(turismoRaw, "turismo") as Record<string, unknown>[] | null;
    const desempeno = val(desempenoRaw, "desempeno") as Record<string, unknown>[] | null;
    const ips = val(ipsRaw, "ips") as Record<string, unknown>[] | null;
    const emergencias = val(emergenciasRaw, "emergencias") as Record<string, unknown>[] | null;
    const victimasMAP = val(victimasMAPRaw, "victimasMAP") as Record<string, unknown>[] | null;
    const masacres = val(masacresRaw, "masacres") as Record<string, unknown>[] | null;
    const precipitacion = val(precipitacionRaw, "precipitacion") as Record<string, unknown>[] | null;
    const temperatura = val(temperaturaRaw, "temperatura") as Record<string, unknown>[] | null;

    // Aggregate IPS by nivel
    const ipsPorNivel: Record<string, number> = {};
    for (const i of ips ?? []) {
      const nivel = String(i.nivel ?? i.clpr_nombre ?? "Sin clasificar");
      ipsPorNivel[nivel] = (ipsPorNivel[nivel] ?? 0) + 1;
    }

    const result = {
      codigo,
      educacion: educacion?.[0] ?? null,
      homicidios: homicidios ?? [],
      agricultura: agricultura ?? [],
      telecomunicaciones: telco ?? [],
      turismo: {
        prestadores: turismo?.length ?? 0,
        habitaciones: turismo?.reduce((s, t) => s + (Number(t.habitaciones) || 0), 0) ?? 0,
        camas: turismo?.reduce((s, t) => s + (Number(t.camas) || 0), 0) ?? 0,
        registros: (turismo ?? []).slice(0, 20),
      },
      desempeno: desempeno ?? [],
      salud: {
        totalIPS: ips?.length ?? 0,
        porNivel: ipsPorNivel,
        establecimientos: (ips ?? []).slice(0, 30).map((i) => ({
          nombre: i.nombre_prestador,
          nivel: i.nivel,
          caracter: i.caracter,
          habilitado: i.habilitado,
          direccion: i.direccion,
        })),
      },
      emergencias: (emergencias ?? []).slice(0, 30).map((e) => ({
        fecha: e.fecha,
        evento: e.evento,
        fallecidos: Number(e.fallecidos ?? 0),
        heridos: Number(e.heridos ?? 0),
        personas: Number(e.personas ?? 0),
        familias: Number(e.familias ?? 0),
        viviendasDestruidas: Number(e.viviendas_destruidas ?? 0),
        viviendasAveriadas: Number(e.viviendas_averiadas ?? 0),
      })),
      conflicto: {
        victimasMAP: victimasMAP ?? [],
        masacres: masacres ?? [],
      },
      clima: {
        precipitacion: (precipitacion ?? []).map((p) => ({
          estacion: p.estaci_n,
          altitud: p.altitud_m,
          ene: p.ene, feb: p.feb, mar: p.mar, abr: p.abr,
          may: p.may, jun: p.jun, jul: p.jul, ago: p.ago,
          sep: p.sep, oct: p.oct, nov: p.nov, dic: p.dic,
          anual: p.anual,
        })),
        temperatura: (temperatura ?? []).map((t) => ({
          estacion: t.estaci_n,
          altitud: t.altitud_m,
          ene: t.ene, feb: t.feb, mar: t.mar, abr: t.abr,
          may: t.may, jun: t.jun, jul: t.jul, ago: t.ago,
          sep: t.sep, oct: t.oct, nov: t.nov, dic: t.dic,
          anual: t.anual,
        })),
      },
    };

    return NextResponse.json(result, {
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=1800",
      },
    });
  } catch (error) {
    console.error(`Error fetching enrichment for ${codigo}:`, error);
    return NextResponse.json({ error: "Failed to fetch enrichment data" }, { status: 500 });
  }
}
