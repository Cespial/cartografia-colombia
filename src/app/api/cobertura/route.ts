import { NextResponse } from "next/server";
import { fetchCoberturaEstado } from "@/lib/igac-api";

export async function GET() {
  try {
    const data = await fetchCoberturaEstado();
    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=43200",
      },
    });
  } catch (error) {
    console.error("Error fetching coverage stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch coverage data" },
      { status: 500 }
    );
  }
}
