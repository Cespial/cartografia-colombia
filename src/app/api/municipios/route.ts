import { NextResponse } from "next/server";
import { fetchMunicipiosIGAC } from "@/lib/igac-api";
import { parseIGACMunicipio } from "@/lib/coverage";

export async function GET() {
  try {
    const data = await fetchMunicipiosIGAC();
    const municipios = (data.features as Record<string, unknown>[]).map((f) =>
      parseIGACMunicipio(f)
    );
    return NextResponse.json(municipios, {
      headers: {
        "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=43200",
      },
    });
  } catch (error) {
    console.error("Error fetching IGAC municipios:", error);
    return NextResponse.json(
      { error: "Failed to fetch IGAC data" },
      { status: 500 }
    );
  }
}
