import { NextResponse } from "next/server";
import { queryIGAC } from "@/lib/igac-api";

/**
 * GET /api/igac/layers?service=Hidrografia&layer=14&bbox=-76,7,-75,10
 * Proxy for spatial IGAC queries with caching
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const service = searchParams.get("service");
  const layer = searchParams.get("layer") ?? "0";
  const bbox = searchParams.get("bbox");

  if (!service) {
    return NextResponse.json({ error: "Missing service parameter" }, { status: 400 });
  }

  try {
    const options: Record<string, unknown> = {
      returnGeometry: true,
    };

    if (bbox) {
      Object.assign(options, {
        geometry: bbox,
        geometryType: "esriGeometryEnvelope",
        inSR: 4326,
        spatialRel: "esriSpatialRelIntersects",
      });
    }

    const data = await queryIGAC(service, parseInt(layer), options);

    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=43200",
      },
    });
  } catch (error) {
    console.error(`Error fetching IGAC layer ${service}/${layer}:`, error);
    return NextResponse.json({ error: "Failed to fetch layer" }, { status: 500 });
  }
}
