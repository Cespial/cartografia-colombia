import { NextResponse } from "next/server";
import {
  fetchDelitosSexuales,
  fetchViolenciaIntrafamiliar,
  fetchHurtos,
  fetchSuicidios,
  fetchAtaquesTerroristas,
  fetchDesaparicionForzada,
} from "@/lib/datos-gov";

/**
 * GET /api/municipios/[codigo]/seguridad
 * Lazy-loaded security enrichment: 6 crime categories
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ codigo: string }> }
) {
  const { codigo } = await params;

  try {
    const [
      delitosSexualesRaw,
      vifRaw,
      hurtosRaw,
      suicidiosRaw,
      ataquesRaw,
      desaparicionRaw,
    ] = await Promise.allSettled([
      fetchDelitosSexuales(codigo),
      fetchViolenciaIntrafamiliar(codigo),
      fetchHurtos(codigo),
      fetchSuicidios(codigo),
      fetchAtaquesTerroristas(codigo),
      fetchDesaparicionForzada(codigo),
    ]);

    const val = <T>(r: PromiseSettledResult<T>): T | null =>
      r.status === "fulfilled" ? r.value : null;

    const result = {
      delitosSexuales: val(delitosSexualesRaw) ?? [],
      violenciaIntrafamiliar: val(vifRaw) ?? [],
      hurtos: val(hurtosRaw) ?? [],
      suicidios: val(suicidiosRaw) ?? [],
      ataquesTerroristas: val(ataquesRaw) ?? [],
      desaparicionForzada: val(desaparicionRaw) ?? [],
    };

    return NextResponse.json(result, {
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=1800",
      },
    });
  } catch (error) {
    console.error(`Error fetching seguridad for ${codigo}:`, error);
    return NextResponse.json(
      { error: "Failed to fetch security data" },
      { status: 500 }
    );
  }
}
