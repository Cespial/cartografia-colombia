import { NextResponse } from "next/server";
import {
  fetchProyectosSGR,
  fetchMineria,
  fetchAeropuertos,
  fetchBDUAContributivo,
  fetchBDUASubsidiado,
  fetchEducacionSuperior,
} from "@/lib/datos-gov";
import { queryIGAC } from "@/lib/igac-api";

/**
 * GET /api/municipios/[codigo]/economia?nombre=X
 * Lazy-loaded economy + territory enrichment: SGR, minería, aeropuertos, BDUA, ed. superior, NBI, densidad
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ codigo: string }> }
) {
  const { codigo } = await params;
  const { searchParams } = new URL(req.url);
  const nombre = searchParams.get("nombre") ?? "";

  try {
    const [
      sgrRaw,
      mineriaRaw,
      aeropuertosRaw,
      bduaContribRaw,
      bduaSubsRaw,
      edSuperiorRaw,
      nbiRaw,
      densidadRaw,
      generalidadesRaw,
    ] = await Promise.allSettled([
      fetchProyectosSGR(codigo),
      nombre ? fetchMineria(nombre) : Promise.resolve([]),
      nombre ? fetchAeropuertos(nombre) : Promise.resolve([]),
      nombre ? fetchBDUAContributivo(nombre) : Promise.resolve([]),
      nombre ? fetchBDUASubsidiado(nombre) : Promise.resolve([]),
      fetchEducacionSuperior(codigo),
      queryIGAC("NBI_Municipios", 7, {
        where: `MpCodigo='${codigo}'`,
        outFields: "MpCodigo,MpNombre,Depto,NBI,Rango",
        returnGeometry: false,
      }),
      queryIGAC("Densidad_Poblacional", 1, {
        where: `MpCodigo='${codigo}'`,
        outFields: "MpCodigo,MpNombre,Depto,V,RA",
        returnGeometry: false,
      }),
      queryIGAC("_Generalidades_Municipios", 0, {
        where: `MpCodigo='${codigo}'`,
        outFields: "*",
        returnGeometry: false,
      }),
    ]);

    const val = <T>(r: PromiseSettledResult<T>): T | null =>
      r.status === "fulfilled" ? r.value : null;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sgrData = (val(sgrRaw) as any[] | null) ?? [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const nbiResult = val(nbiRaw) as any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const densidadResult = val(densidadRaw) as any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const generalidadesResult = val(generalidadesRaw) as any;

    const nbiFeature = nbiResult?.features?.[0]?.properties ?? null;
    const densidadFeature = densidadResult?.features?.[0]?.properties ?? null;
    const generalidadesFeature =
      generalidadesResult?.features?.[0]?.properties ?? null;

    const result = {
      sgr: sgrData.slice(0, 20).map((p) => ({
        nombre: p.nombre,
        estado: p.estado,
        valorTotal: Number(p.valortotal) || 0,
        sector: p.sector,
        ejecucionFisica: Number(p.ejecucionfisica) || 0,
        ejecucionFinanciera: Number(p.ejecucionfinanciera) || 0,
      })),
      mineria: val(mineriaRaw) ?? [],
      aeropuertos: val(aeropuertosRaw) ?? [],
      bduaContributivo: val(bduaContribRaw) ?? [],
      bduaSubsidiado: val(bduaSubsRaw) ?? [],
      educacionSuperior: val(edSuperiorRaw) ?? [],
      nbi: nbiFeature
        ? { nbi: Number(nbiFeature.NBI) || null, rango: nbiFeature.Rango }
        : null,
      densidad: densidadFeature
        ? {
            poblacion: Number(densidadFeature.V) || null,
            rangoArea: densidadFeature.RA,
          }
        : null,
      generalidades: generalidadesFeature,
    };

    return NextResponse.json(result, {
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=1800",
      },
    });
  } catch (error) {
    console.error(`Error fetching economia for ${codigo}:`, error);
    return NextResponse.json(
      { error: "Failed to fetch economy data" },
      { status: 500 }
    );
  }
}
