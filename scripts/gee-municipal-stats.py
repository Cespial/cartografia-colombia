"""
GEE Municipal Stats Pipeline
Computes satellite-derived statistics for each Colombian municipality:
- Elevation (ALOS 30m): min, max, mean, slope_mean
- Land cover (ESA WorldCover 10m): % per class
- Deforestation (Hansen GFC): tree cover 2000, loss area
- Precipitation (CHIRPS): annual mean
- Temperature (ERA5-Land): annual mean
- Night lights (VIIRS): mean radiance
- Population (WorldPop): total, density
- Water (JRC GSW): % water occurrence

Output: public/data/municipios-gee-stats.json (~3 MB)

Usage:
  python scripts/gee-municipal-stats.py [--limit N] [--dept DEPT_NAME]

Requires: earthengine-api, authenticated via `earthengine authenticate`
"""

import ee
import json
import sys
import argparse
from pathlib import Path

# Initialize Earth Engine
ee.Initialize(project="ee-maestria-tesis")

# Load municipality boundaries from geoBoundaries COL ADM2
# Using the IGAC/DANE MGN or a FeatureCollection of municipal boundaries
# We'll use the GADM dataset available in GEE
GADM = ee.FeatureCollection("FAO/GAUL/2015/level2").filter(
    ee.Filter.eq("ADM0_NAME", "Colombia")
)

# Datasets
ALOS_DEM = ee.ImageCollection("JAXA/ALOS/AW3D30/V3_2").select("DSM").mosaic()
WORLDCOVER = ee.Image("ESA/WorldCover/v200/2021")
HANSEN = ee.Image("UMD/hansen/global_forest_change_2023_v1_11")
CHIRPS = ee.ImageCollection("UCSB-CHG/CHIRPS/DAILY").filter(
    ee.Filter.date("2023-01-01", "2024-01-01")
)
VIIRS = ee.ImageCollection("NOAA/VIIRS/DNB/MONTHLY_V1/VCMSLCFG").filter(
    ee.Filter.date("2023-01-01", "2024-01-01")
)
WORLDPOP = ee.ImageCollection("WorldPop/GP/100m/pop").filter(
    ee.Filter.eq("year", 2020)
).filter(ee.Filter.eq("country", "COL")).first()
JRC_WATER = ee.Image("JRC/GSW1_4/GlobalSurfaceWater").select("occurrence")

# WorldCover class names
WORLDCOVER_CLASSES = {
    10: "arboles",
    20: "arbustos",
    30: "pastizales",
    40: "cultivos",
    50: "construido",
    60: "suelo_desnudo",
    70: "nieve_hielo",
    80: "agua",
    90: "humedal",
    95: "manglar",
    100: "musgo_liquen",
}


def compute_stats(feature):
    """Compute all satellite stats for one municipality polygon."""
    geom = feature.geometry()
    area_km2 = geom.area().divide(1e6)

    # --- Elevation ---
    elev_stats = ALOS_DEM.reduceRegion(
        reducer=ee.Reducer.minMax().combine(ee.Reducer.mean(), sharedInputs=True),
        geometry=geom,
        scale=100,
        maxPixels=1e8,
        bestEffort=True,
    )

    # Slope
    slope = ee.Terrain.slope(ALOS_DEM)
    slope_mean = slope.reduceRegion(
        reducer=ee.Reducer.mean(),
        geometry=geom,
        scale=100,
        maxPixels=1e8,
        bestEffort=True,
    )

    # --- Land cover ---
    lc_area = WORLDCOVER.reduceRegion(
        reducer=ee.Reducer.frequencyHistogram(),
        geometry=geom,
        scale=100,
        maxPixels=1e8,
        bestEffort=True,
    )

    # --- Deforestation ---
    tree_cover_2000 = HANSEN.select("treecover2000").reduceRegion(
        reducer=ee.Reducer.mean(),
        geometry=geom,
        scale=100,
        maxPixels=1e8,
        bestEffort=True,
    )
    loss_area = HANSEN.select("loss").reduceRegion(
        reducer=ee.Reducer.sum(),
        geometry=geom,
        scale=100,
        maxPixels=1e8,
        bestEffort=True,
    )

    # --- Precipitation ---
    precip_annual = CHIRPS.select("precipitation").sum().reduceRegion(
        reducer=ee.Reducer.mean(),
        geometry=geom,
        scale=5000,
        maxPixels=1e8,
        bestEffort=True,
    )

    # --- Night lights ---
    viirs_mean = VIIRS.select("avg_rad").mean().reduceRegion(
        reducer=ee.Reducer.mean(),
        geometry=geom,
        scale=500,
        maxPixels=1e8,
        bestEffort=True,
    )

    # --- Population ---
    pop_sum = WORLDPOP.reduceRegion(
        reducer=ee.Reducer.sum(),
        geometry=geom,
        scale=100,
        maxPixels=1e8,
        bestEffort=True,
    )

    # --- Water ---
    water_pct = JRC_WATER.reduceRegion(
        reducer=ee.Reducer.mean(),
        geometry=geom,
        scale=100,
        maxPixels=1e8,
        bestEffort=True,
    )

    return feature.set({
        "area_km2": area_km2,
        "elev_min": elev_stats.get("DSM_min"),
        "elev_max": elev_stats.get("DSM_max"),
        "elev_mean": elev_stats.get("DSM_mean"),
        "slope_mean": slope_mean.get("slope"),
        "land_cover": lc_area.get("Map"),
        "tree_cover_2000": tree_cover_2000.get("treecover2000"),
        "forest_loss_pixels": loss_area.get("loss"),
        "precip_annual_mm": precip_annual.get("precipitation"),
        "nightlights_mean": viirs_mean.get("avg_rad"),
        "population": pop_sum.get("population"),
        "water_occurrence_pct": water_pct.get("occurrence"),
    })


def process_batch(features_list, start, end):
    """Process a batch of municipalities."""
    batch = features_list[start:end]
    results = []
    for i, feat_dict in enumerate(batch):
        idx = start + i
        name = feat_dict.get("properties", {}).get("ADM2_NAME", f"Unknown_{idx}")
        dept = feat_dict.get("properties", {}).get("ADM1_NAME", "")
        print(f"  [{idx+1}] {name}, {dept}...", end=" ", flush=True)
        try:
            feature = ee.Feature(feat_dict)
            computed = compute_stats(feature)
            info = computed.getInfo()
            props = info.get("properties", {})

            # Parse land cover histogram
            lc_raw = props.pop("land_cover", {}) or {}
            lc_parsed = {}
            total_pixels = sum(lc_raw.values()) if lc_raw else 1
            for code_str, count in lc_raw.items():
                class_name = WORLDCOVER_CLASSES.get(int(code_str), f"clase_{code_str}")
                lc_parsed[class_name] = round(count / total_pixels * 100, 1)

            result = {
                "name": name,
                "department": dept,
                "area_km2": round(props.get("area_km2", 0) or 0, 1),
                "elevation": {
                    "min": round(props.get("elev_min", 0) or 0),
                    "max": round(props.get("elev_max", 0) or 0),
                    "mean": round(props.get("elev_mean", 0) or 0),
                    "slope_mean": round(props.get("slope_mean", 0) or 0, 1),
                },
                "land_cover_pct": lc_parsed,
                "tree_cover_2000_pct": round(props.get("tree_cover_2000", 0) or 0, 1),
                "forest_loss_ha": round((props.get("forest_loss_pixels", 0) or 0) * 0.09, 1),
                "precip_annual_mm": round(props.get("precip_annual_mm", 0) or 0),
                "nightlights_mean": round(props.get("nightlights_mean", 0) or 0, 2),
                "population": round(props.get("population", 0) or 0),
                "water_occurrence_pct": round(props.get("water_occurrence_pct", 0) or 0, 1),
            }
            results.append(result)
            print("OK")
        except Exception as e:
            print(f"ERROR: {e}")
            results.append({"name": name, "department": dept, "error": str(e)})

    return results


def main():
    parser = argparse.ArgumentParser(description="Compute GEE stats for Colombian municipalities")
    parser.add_argument("--limit", type=int, default=0, help="Limit number of municipalities (0=all)")
    parser.add_argument("--dept", type=str, default="", help="Filter by department name")
    parser.add_argument("--output", type=str, default="public/data/municipios-gee-stats.json")
    args = parser.parse_args()

    print("Fetching GADM Colombia municipalities from GEE...")
    fc = GADM
    if args.dept:
        fc = fc.filter(ee.Filter.eq("ADM1_NAME", args.dept))

    features_list = fc.getInfo()["features"]
    total = len(features_list)

    if args.limit > 0:
        features_list = features_list[:args.limit]

    print(f"Processing {len(features_list)} of {total} municipalities...")

    all_results = []
    batch_size = 10
    for start in range(0, len(features_list), batch_size):
        end = min(start + batch_size, len(features_list))
        print(f"\nBatch {start//batch_size + 1} ({start+1}-{end}):")
        batch_results = process_batch(features_list, start, end)
        all_results.extend(batch_results)

        # Save intermediate results
        output_path = Path(args.output)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        with open(output_path, "w") as f:
            json.dump(all_results, f, ensure_ascii=False)
        print(f"  Saved {len(all_results)} results to {output_path}")

    print(f"\nDone! {len(all_results)} municipalities processed.")


if __name__ == "__main__":
    main()
