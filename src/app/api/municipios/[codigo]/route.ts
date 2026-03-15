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
} from "@/lib/datos-gov";

/**
 * GET /api/municipios/[codigo]
 * Returns enriched data for a single municipality from datos.gov.co
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ codigo: string }> }
) {
  const { codigo } = await params;

  try {
    // Fetch all datos.gov.co sources in parallel
    const [
      educacionRaw,
      homicidiosRaw,
      agriculturaRaw,
      telcoRaw,
      turismoRaw,
      desempenoRaw,
    ] = await Promise.allSettled([
      fetchEducacion(codigo),
      fetchHomicidios(codigo),
      fetchAgricultura(codigo),
      fetchCoberturaTelco(codigo),
      fetchTurismo(codigo),
      fetchDesempenoMunicipal(codigo),
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
