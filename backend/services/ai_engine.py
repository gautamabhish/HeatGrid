from tracemalloc import start

import pandas as pd
import pvlib
import math
import os
import json
import random
from google import genai

async def generate_recommendations(gee_data: dict, osm_data: dict):
    """
    AI Logic-Based Intervention Model using Google Gemini.
    Returns:
      - list of AI intervention cards (for sidebar)
      - per-building zone tags injected directly into osm_data["buildings"]["features"]
    """
    buildings = osm_data.get("buildings", {}).get("features", [])
    roads = osm_data.get("roads", {}).get("features", [])
    parks = osm_data.get("parks", {}).get("features", [])

    avg_temp = gee_data.get("avg_lst_celsius", 0)
    avg_ndvi = gee_data.get("avg_ndvi", 0)
    city_coords = osm_data.get("center", [0, 0])
    lon, lat = city_coords[0], city_coords[1]

    # ------------------------------------------------------------------
    # SHADOW MODELING (2:00 PM, July 15th — peak summer heat)
    # ------------------------------------------------------------------
    shadow_msg = "No significant shading"
    shadow_direction_deg = 180  # default south
    avg_shadow_length_m = 5.0

    if lat != 0 and lon != 0:
        try:
            # Calculate 2:00 PM Local Mean Solar Time in UTC
            time = pd.Timestamp("2026-07-15 00:00:00", tz="UTC") + pd.Timedelta(hours=14 - (lon / 15.0))
            solar_position = pvlib.solarposition.get_solarposition(time, lat, lon)
            zenith_angle = solar_position['apparent_zenith'].iloc[0]
            azimuth_angle = solar_position['azimuth'].iloc[0]

            valid_heights = []
            for b in buildings:
                levels = b.get("properties", {}).get("building:levels")
                if levels:
                    try:
                        valid_heights.append(float(levels) * 3.0)
                    except Exception:
                        pass

            avg_height = sum(valid_heights) / len(valid_heights) if valid_heights else 6.0
            sun_alt = 90 - zenith_angle

            if sun_alt > 0:
                avg_shadow_length_m = avg_height / math.tan(math.radians(sun_alt))
                shadow_direction_deg = azimuth_angle + 180
                if shadow_direction_deg > 360:
                    shadow_direction_deg -= 360

                direction_str = "North"
                if 45 <= shadow_direction_deg < 135:
                    direction_str = "East"
                elif 135 <= shadow_direction_deg < 225:
                    direction_str = "South"
                elif 225 <= shadow_direction_deg < 315:
                    direction_str = "West"

                shadow_msg = f"avg {avg_shadow_length_m:.1f}m {direction_str}-facing shadows"
        except Exception as e:
            print("Shadow calc error:", e)

    # ------------------------------------------------------------------
    # PER-BUILDING ZONE CLASSIFICATION (ML Proxy)
    # Tagging each building with an intervention_zone field
    # so the frontend can color-code the map.
    # ------------------------------------------------------------------
    zone_counts = {"misting_zone": 0, "reflective_roof_zone": 0, "green_corridor_zone": 0, "none": 0}

    for feature in buildings:
        props = feature.get("properties", {})
        simulated_lst = float(props.get("simulated_lst") or avg_temp)
        svf = float(props.get("svf") or 1.0)
        ped_score = int(props.get("pedestrian_proxy") or 1)
        roof_type = str(props.get("roof_type") or "unknown")

        zone = "none"

        # Priority 1: High heat + high foot traffic → Misting Station zone
        if simulated_lst >= 32.0 and ped_score >= 6:
            zone = "misting_zone"

        # Priority 2: Dense canyon (low SVF) or dark roofs → Reflective Roof zone
        elif svf < 0.6 or roof_type == "dark":
            zone = "reflective_roof_zone"

        # Priority 3: Low vegetation area → Green Corridor zone
        elif avg_ndvi < 0.3 and simulated_lst >= 30.0:
            zone = "green_corridor_zone"

        props["intervention_zone"] = zone
        props["shadow_direction_deg"] = round(shadow_direction_deg, 1)
        props["shadow_length_m"] = round(avg_shadow_length_m, 1)
        zone_counts[zone] += 1

    # ------------------------------------------------------------------
    # AGGREGATE ML FEATURES FOR GEMINI PROMPT
    # ------------------------------------------------------------------
    avg_ped_score = 1
    avg_svf = 1.0
    if buildings:
        valid_peds = []
        for b in buildings:
            p = b.get("properties", {}).get("pedestrian_proxy")
            if p not in (None, ""):
                try:
                    valid_peds.append(float(p))
                except ValueError:
                    pass
        if valid_peds:
            avg_ped_score = sum(valid_peds) / len(valid_peds)

        valid_svf = []
        for b in buildings:
            s = b.get("properties", {}).get("svf")
            if s not in (None, ""):
                try:
                    valid_svf.append(float(s))
                except ValueError:
                    pass
        if valid_svf:
            avg_svf = sum(valid_svf) / len(valid_svf)

    dark_roofs = sum(1 for b in buildings if b.get("properties", {}).get("roof_type") == "dark")
    ml_zones = []
    if avg_temp >= 32.0 and avg_ped_score >= 6:
        ml_zones.append("Public Misting Station")
    if avg_svf < 0.7 or (dark_roofs > len(buildings) * 0.2 and len(buildings) > 20):
        ml_zones.append("Cool Reflective Roof")
    if avg_ndvi < 0.3 and len(roads) > 3:
        ml_zones.append("Green Street Corridor")

    roi_multiplier = 1.0 + (avg_ped_score / 10.0)
    if "school" in str(osm_data) or "hospital" in str(osm_data):
        roi_multiplier += 0.5

    # ------------------------------------------------------------------
    # GEMINI AI — STRUCTURED INTERVENTION RECOMMENDATIONS
    # ------------------------------------------------------------------
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        print("GEMINI_API_KEY not found. Using fallback mock AI.")
        return get_fallback_recommendations(gee_data, osm_data, shadow_msg, zone_counts)

    try:
        client = genai.Client(api_key=api_key)
        prompt = f"""
You are an expert urban climate engineer designing cooling strategies for cities.

Analyze the micro-climate data below and recommend the most effective heat mitigation interventions.

Context:
- Average Surface Temperature: {avg_temp}°C
- Avg Sky View Factor (SVF): {avg_svf:.2f} (0 = deep canyon, 1 = open sky)
- Pedestrian Flow Proxy (1-10): {avg_ped_score:.1f}
- Average NDVI (vegetation density): {avg_ndvi:.2f}
- Shadow Modeling (July 2PM): {shadow_msg}
- ROI Multiplier (human exposure): {roi_multiplier:.1f}x
- Classified Building Zones: {zone_counts['misting_zone']} misting, {zone_counts['reflective_roof_zone']} reflective roof, {zone_counts['green_corridor_zone']} green corridor

Engineering Rules:
Choose interventions from DIFFERENT cooling mechanisms where possible.

Cooling mechanisms include:
1. Vegetation (trees, green walls, green roofs)
2. Surface albedo improvements (cool roofs, reflective pavements)
3. Water-based cooling (misting, fountains, evaporative features)
4. Shade infrastructure (tensile canopies, solar shade roofs, bus shelter shading)
5. Urban material redesign (permeable pavements, cool asphalt)
6. Architectural cooling (facade shading, ventilated roofs)
7. Urban airflow engineering (ventilation corridors)

Avoid recommending the same type of intervention multiple times unless the data strongly demands it.

Do NOT automatically suggest tree canopy, cool roofs, or misting systems unless clearly justified by the data.

Return ONLY valid JSON matching this schema (no markdown):

{{
  "interventions": [
    {{
      "type": "Name of intervention",
      "icon": "tree | roof | mist | corridor | pavement | shade | water | facade | ventilation",
      "target": "Target area description",
      "impact_estimate": "e.g. '-1.5°C ambient'",
      "cost_estimate": "$ | $$ | $$$",
      "roi_score": <int 1-100>,
      "priority_label": "Priority 1 | Priority 2 | Priority 3",
      "narrative": "1 sentence explanation",
      "engineering_insight": "2-3 sentence technical explanation describing the physical reason this intervention reduces heat here."
    }}
  ],
  "overall_summary": "2 sentence explanation of neighborhood heat vulnerability.",
  "sun_exposed_side": "North | South | East | West",
  "tree_recommendation_side": "Which side of the street to plant trees for maximum shade"
}}
"""

        import asyncio
        loop = asyncio.get_event_loop()
        response = await loop.run_in_executor(
            None,
            lambda: client.models.generate_content(
                model='gemini-2.5-flash',
                contents=prompt,
                config={'system_instruction': 'You are an expert urban climate planner.','temperature':0.7}
            )
        )

        try:
            response_text = response.text.strip()
            if response_text.startswith("```json"):
                response_text = response_text[7:]
                if response_text.endswith("```"):
                    response_text = response_text[:-3]
            elif response_text.startswith("```"):
                response_text = response_text[3:]
                if response_text.endswith("```"):
                    response_text = response_text[:-3]

            # data = json.loads(response_text.strip())
            #format data into json using re to extract the json part from the response
            start = response_text.find("{")
            end = response_text.rfind("}")

            if start == -1 or end == -1:
                raise ValueError("No JSON found in Gemini response")

            json_text = response_text[start:end+1]

            data = json.loads(json_text)
            interventions = data.get("interventions", [])
            interventions.sort(key=lambda x: x.get("roi_score", 0), reverse=True)

            return {
                "interventions": interventions,
                "overall_summary": data.get("overall_summary", ""),
                "sun_exposed_side": data.get("sun_exposed_side", direction_str if 'direction_str' in dir() else "South"),
                "tree_recommendation_side": data.get("tree_recommendation_side", ""),
                "shadow_msg": shadow_msg,
                "zone_counts": zone_counts,
            }
        except json.JSONDecodeError as err:
            print("Failed to parse Gemini JSON:", err)
            print("Response was:", response.text[:500])
            return get_fallback_recommendations(gee_data, osm_data, shadow_msg, zone_counts)

    except Exception as e:
        print("Gemini API Error:", e)
        return get_fallback_recommendations(gee_data, osm_data, shadow_msg, zone_counts)


def get_fallback_recommendations(gee_data, osm_data, shadow_msg, zone_counts=None):
    """Fallback rule-based output if Gemini fails or is unauthenticated."""
    interventions = []
    buildings = osm_data.get("buildings", {}).get("features", [])
    roads = osm_data.get("roads", {}).get("features", [])
    parks = osm_data.get("parks", {}).get("features", [])
    avg_temp = gee_data.get("avg_lst_celsius", 0)
    avg_ndvi = gee_data.get("avg_ndvi", 1)

    high_heat = avg_temp > 30.0
    lack_of_parks = len(parks) < 3
    heavy_roads = len(roads) > 5
    dense_buildings = len(buildings) > 50

    # Always add Green Street Corridor as priority 1 with ROI 85
    interventions.append({
        "type": "Green Street Corridor",
        "icon": "corridor",
        "target": f"Sun-exposed pavements ({shadow_msg})",
        "impact_estimate": "-1.5°C ambient",
        "cost_estimate": "$$$",
        "roi_score": 85,
        "priority_label": "Priority 1",
        "narrative": "Implements a shaded avenue to actively cool key pedestrian thoroughfares.",
        "engineering_insight": "Wide, heavily paved asphalt roads act as immense thermal batteries, absorbing shortwave radiation and re-emitting it as longwave heat. Introducing a green corridor disrupts this cycle through evapotranspirative cooling and direct canopy shading, which can drop local surface temperatures significantly."
    })

    # Always add Cool Reflective Roof as priority 3 with ROI 70
    interventions.append({
        "type": "Cool Reflective Roof",
        "icon": "roof",
        "target": "Hotspot Buildings (Dark Roofs)",
        "impact_estimate": "-2.5°C localized",
        "cost_estimate": "$",
        "roi_score": 70,
        "priority_label": "Priority 3",
        "narrative": "Upgrades high-absorption building rooftops with highly reflective coatings.",
        "engineering_insight": "Dense building footprints with dark rooftops have a low albedo, absorbing up to 90% of solar radiation. Applying reflective cool roof coatings increases albedo, deflecting the sun's energy back into the atmosphere rather than transferring it into the building's thermal mass or the surrounding air."
    })

    # Always add Public Misting Station as priority 2 with ROI 92
    interventions.append({
        "type": "Public Misting Station",
        "icon": "mist",
        "target": "High Pedestrian Traffic Squares",
        "impact_estimate": "Immediate Relief",
        "cost_estimate": "$$",
        "roi_score": 92,
        "priority_label": "Priority 2",
        "narrative": "Deploys atomized water systems in concentrated human-traffic zones.",
        "engineering_insight": "When surface temperatures exceed 33°C in dense urban canyons, natural convective cooling fails. Misting stations leverage the latent heat of vaporization; as the micro-droplets evaporate, they absorb sensible heat from the surrounding air, creating an immediate and localized drop in ambient temperature."
    })

    interventions.sort(key=lambda x: x.get("roi_score", 0), reverse=True)
    return {
        "interventions": interventions,
        "overall_summary": f"This neighborhood has an average surface temperature of {avg_temp:.1f}°C with {'limited' if avg_ndvi < 0.3 else 'moderate'} vegetation cover. Prioritize green infrastructure and reflective surfaces.",
        "sun_exposed_side": "South",
        "tree_recommendation_side": "South and West sides of streets for maximum afternoon shade",
        "shadow_msg": shadow_msg,
        "zone_counts": zone_counts or {},
    }
