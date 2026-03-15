import { NextResponse } from "next/server";
import {
  fetchEducacionDepartamento,
  fetchPIBDepartamental,
} from "@/lib/datos-gov";

/**
 * GET /api/departamentos/[codigo]
 * Department-level enrichment: education stats + PIB
 * [codigo] is the URL-encoded department name (e.g., "ANTIOQUIA")
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ codigo: string }> }
) {
  const { codigo } = await params;
  const departamento = decodeURIComponent(codigo);

  try {
    const [educacionRaw, pibRaw] = await Promise.allSettled([
      fetchEducacionDepartamento(departamento),
      fetchPIBDepartamental(departamento),
    ]);

    const val = <T>(r: PromiseSettledResult<T>): T | null =>
      r.status === "fulfilled" ? r.value : null;

    const educacion = val(educacionRaw) as Record<string, unknown>[] | null;
    const pib = val(pibRaw) as Record<string, unknown>[] | null;

    // PIB: get most recent year's total (precios corrientes)
    const pibCorrientes = (pib ?? []).filter(
      (p) => p.tipo_de_precios === "PIB a precios corrientes"
    );
    const pibYears = [
      ...new Set(pibCorrientes.map((p) => String(p.a_o))),
    ]
      .sort()
      .reverse();
    const latestYear = pibYears[0] ?? null;
    const latestPib = latestYear
      ? pibCorrientes
          .filter((p) => String(p.a_o) === latestYear)
          .reduce(
            (s, p) => s + (Number(p.valor_miles_de_millones_de) || 0),
            0
          )
      : null;

    const result = {
      educacion: educacion?.[0] ?? null,
      pib: {
        anio: latestYear,
        totalMilesMM: latestPib,
        sectores: pibCorrientes
          .filter((p) => String(p.a_o) === latestYear)
          .map((p) => ({
            actividad: p.actividad,
            valor: Number(p.valor_miles_de_millones_de) || 0,
          }))
          .sort((a, b) => b.valor - a.valor)
          .slice(0, 10),
      },
    };

    return NextResponse.json(result, {
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=1800",
      },
    });
  } catch (error) {
    console.error(
      `Error fetching department data for ${departamento}:`,
      error
    );
    return NextResponse.json(
      { error: "Failed to fetch department data" },
      { status: 500 }
    );
  }
}
