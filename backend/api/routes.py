from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from services.osm_pipeline import get_osm_data
from services.weather_pipeline import get_current_weather
from services.ai_engine import generate_recommendations

router = APIRouter()

from typing import Optional

class CityRequest(BaseModel):
    city_name: str
    country: Optional[str] = None
    lat: Optional[float] = None  # pre-geocoded from Nominatim on frontend
    lng: Optional[float] = None  # pre-geocoded from Nominatim on frontend

from fastapi.responses import StreamingResponse
import json
import asyncio

@router.post("/analyze-city")
async def analyze_city(req: CityRequest):
    """
    Main endpoint: Streams JSON chunks to update frontend on progress.
    Yields intermediate status updates, and finally the complete payload.
    """
    full_name = f"{req.city_name}, {req.country}" if req.country else req.city_name
    print(f"Starting analysis for: {full_name}")

    async def stream_analysis():
        try:
            # Stage 1: OSM Fetching
            yield json.dumps({"status": "loading", "message": "Fetching map sub-sections..."}) + "\n"
            await asyncio.sleep(0.1) # small flush yield
            
            osm_data = None
            async for chunk in get_osm_data(full_name, lat=req.lat, lng=req.lng):
                if isinstance(chunk, str):
                    # It's a status update JSON string like '{"status": "buildings_fetched"}'
                    yield chunk + "\n"
                elif isinstance(chunk, dict):
                    # It's the final payload dict or an error dict
                    osm_data = chunk
            
            print("OSM data fetched")
            
            if not osm_data or "error" in osm_data:
                err_msg = osm_data["error"] if osm_data else "Unknown error"
                yield json.dumps({"status": "error", "message": f"Could not find map data for '{full_name}'. (OSM error: {err_msg})"}) + "\n"
                return

            yield json.dumps({"status": "loading", "message": "Analyzing street footprints and greenery..."}) + "\n"
            
            # Stage 2: Weather and Baseline
            center_coords = osm_data.get("center", [0, 0])
            weather_data = await get_current_weather(lat=center_coords[1], lng=center_coords[0])
            base_temp = weather_data["temperature"]
            print("Weather data fetched")
            
            yield json.dumps({"status": "loading", "message": "Computing local heat vulnerability indices..."}) + "\n"
            
            # Apply offsets
            if "buildings" in osm_data and "features" in osm_data["buildings"]:
                for feature in osm_data["buildings"]["features"]:
                    offset = feature["properties"].get("hvi_offset", 0)
                    feature["properties"]["simulated_lst"] = round(base_temp + offset, 2)
                    feature["properties"].pop("hvi_offset", None)
                    feature["properties"].pop("building", None)
            
            # GEE metrics setup
            num_parks = len(osm_data.get("parks", {}).get("features", []))
            metrics_data = {
                "avg_lst_celsius": base_temp,
                "avg_ndvi": round(min(0.1 + (num_parks * 0.05), 0.8), 3),
            }
            
            yield json.dumps({"status": "loading", "message": "Running AI cooling recommendations model..."}) + "\n"
            print("AI analysis")
            
            # Stage 3: AI Engine
            ai_result = await generate_recommendations(metrics_data, osm_data)

            # Stage 4: Final Payload
            final_payload = {
                "city": full_name,
                "status": "success",
                "data": {
                    "gee_metrics": metrics_data,
                    "weather": weather_data,
                    "osm_features": osm_data,
                    "ai_interventions": ai_result.get("interventions", []),
                    "overall_summary": ai_result.get("overall_summary", ""),
                    "sun_exposed_side": ai_result.get("sun_exposed_side", "South"),
                    "tree_recommendation_side": ai_result.get("tree_recommendation_side", ""),
                    "shadow_msg": ai_result.get("shadow_msg", ""),
                    "zone_counts": ai_result.get("zone_counts", {}),
                }
            }
            yield json.dumps(final_payload) + "\n"

        except Exception as e:
            print(f"Error in stream: {e}")
            yield json.dumps({"status": "error", "message": str(e)}) + "\n"

    return StreamingResponse(stream_analysis(), media_type="application/x-ndjson")
