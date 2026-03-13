import osmnx as ox
import geopandas as gpd
import random
import json

async def get_osm_data(city_name: str, lat: float = None, lng: float = None):
    """
    Fetch building footprints and road networks using osmnx.
    If lat/lng are provided (pre-geocoded by Nominatim), use them directly
    instead of re-geocoding — avoids 'No data elements' for complex place names.
    """
    try:
        print(f"Fetching OSM data for {city_name} with lat={lat} lng={lng}")
        # Set User-Agent to avoid being blocked by Nominatim API
        ox.settings.user_agent = 'AnyCityHeatMapper/1.0'

        if lat is not None and lng is not None:
            # Use the pre-geocoded coordinates directly
            pass
        else:
            # Fall back to osmnx geocoding
            lat, lng = ox.geocode(city_name)
        
        # Fetch various features within a smaller radius to prevent O(N*M) query limits hanging the server
        radius = 300
        point = (lat, lng)

        def safe_fetch(point, tags, dist):
            try:
                return ox.features_from_point(point, tags=tags, dist=dist)
            except Exception:
                return gpd.GeoDataFrame()

        # 1. Buildings
        # Include 'building:levels' attribute to estimate height, and roof material/colour proxies
        tags = {'building': True}
        buildings = safe_fetch(point, tags=tags, dist=radius)
        if not buildings.empty:
            cols_to_keep = ['geometry', 'building']
            for tag in ['building:levels', 'roof:colour', 'roof:material']:
                if tag in buildings.columns:
                    cols_to_keep.append(tag)
            buildings = buildings[cols_to_keep]
        print("Building data fetched")
        # 2. Roads (Highways) & Pedestrian Infrastructure
        # Include 'width' or 'lanes', and 'highway' types to gauge pedestrian flow
        roads = safe_fetch(point, tags={'highway': True}, dist=radius)
        if not roads.empty:
            roads = roads[roads.geometry.type == 'LineString']
            cols_to_keep = ['geometry', 'highway']
            for tag in ['width', 'lanes', 'foot', 'sidewalk']:
                if tag in roads.columns: cols_to_keep.append(tag)
            roads = roads[cols_to_keep]
        print("Road data fetched")

        # 2.5 High-Value / High-Pedestrian Amenities (Schools, Hospitals)
        amenities = safe_fetch(point, tags={'amenity': ['school', 'hospital', 'kindergarten', 'marketplace']}, dist=radius)
        if not amenities.empty:
            amenities = amenities[amenities.geometry.type.isin(['Polygon', 'MultiPolygon', 'Point'])]
        print("Amenity data fetched")   
        
        # 3. Parks (Leisure=park, landuse=grass/forest)
        parks = safe_fetch(point, tags={
            'leisure': ['park', 'garden', 'pitch'],
            'landuse': ['grass', 'forest', 'recreation_ground', 'meadow']
        }, dist=radius)
        if not parks.empty:
            parks = parks[parks.geometry.type.isin(['Polygon', 'MultiPolygon'])]

        # 4. Water Bodies
        water = safe_fetch(point, tags={'water': True, 'natural': 'water'}, dist=radius)
        if not water.empty:
            water = water[water.geometry.type.isin(['Polygon', 'MultiPolygon'])]
    
        # --- Calculate HVI, SVF, and ML Proxy Data ---
        if not buildings.empty:
            buildings = buildings.copy()
            
            lst_offsets = []
            svf_scores = []
            pedestrian_proxies = [] # 1-10 scale
            roof_proxies = [] # 'dark', 'light', 'green', 'unknown'
            
            for idx, row in buildings.iterrows():
                geom = row['geometry']
                offset = 4.0 # Base urban heat island effect
                
                # --- Parks and Water HVI ---
                if not parks.empty:
                    min_park_dist = parks.distance(geom).min()
                    if min_park_dist < 0.0005: offset -= 2.5
                    elif min_park_dist < 0.001: offset -= 1.0
                        
                if not water.empty:
                    min_water_dist = water.distance(geom).min()
                    if min_water_dist < 0.0005: offset -= 1.5
                    
                # --- Sky View Factor (SVF) Heat Trapping ---
                # Default building height if not specified is ~6 meters (2 stories)
                levels = row.get('building:levels')
                try:
                    bldg_height = float(levels) * 3 if levels else 6.0
                except (ValueError, TypeError):
                    bldg_height = 6.0
                    
                # Find nearest road width to calculate H/W ratio
                street_width = 10.0 # Default residential street ~10m
                if not roads.empty:
                    # Find closest road
                    closest_road_idx = roads.distance(geom).idxmin()
                    if isinstance(closest_road_idx, list): closest_road_idx = closest_road_idx[0]
                    closest_road = roads.loc[closest_road_idx]
                    
                    # Try to get width from tags
                    w_tag = closest_road.get('width')
                    l_tag = closest_road.get('lanes')
                    try:
                        if w_tag: street_width = float(w_tag)
                        elif l_tag: street_width = float(l_tag) * 3.5  # ~3.5m per lane
                    except (ValueError, TypeError):
                        pass
                
                # H/W Ratio (Height-to-Width)
                # Higher H/W ratio (> 1.5) means deep canyon = traps heat
                hw_ratio = bldg_height / max(street_width, 1.0)
                
                # SVF approximation: 1 / (1 + hw_ratio^2)^0.5
                # SVF ~ 1 means flat open sky (cools easily at night)
                # SVF close to 0 means trapped canyon (retains daytime heat)
                svf = 1.0 / ((1.0 + hw_ratio**2)**0.5)
                
                # Add intense heat offset for deep canyons
                if svf < 0.4:
                    offset += 3.0  # Severe heat trap
                elif svf < 0.6:
                    offset += 1.5  # Moderate heat trap
                    
                # --- Pedestrian Flow Proxy ---
                ped_score = 1
                if not amenities.empty:
                    # Very close to school/hospital means very high flow
                    min_amenity_dist = amenities.distance(geom).min()
                    if min_amenity_dist < 0.001: ped_score = 10
                    elif min_amenity_dist < 0.003: ped_score = 8
                
                # Boost pedestrian flow score if nearest road is pedestrian/living_street
                if 'closest_road' in locals() and closest_road is not None:
                    hw_type = closest_road.get('highway', '')
                    if hw_type in ['pedestrian', 'living_street', 'footway', 'path']:
                        ped_score = max(ped_score, 7)
                    if closest_road.get('sidewalk') and closest_road.get('sidewalk') != 'no':
                        ped_score = max(ped_score, 5)

                # --- Roof Albedo / Material Proxy for ML ---
                roof_color = str(row.get('roof:colour', '')).lower()
                roof_mat = str(row.get('roof:material', '')).lower()
                r_type = 'unknown'
                if roof_color in ['black', 'dark', 'grey', 'red', 'brown']: r_type = 'dark'
                elif roof_color in ['white', 'light', 'silver']: r_type = 'light'
                elif roof_mat in ['tar_paper', 'bitumen', 'slate']: r_type = 'dark'
                elif roof_color in ['green'] or roof_mat in ['grass', 'plants']: r_type = 'green'
                
                # Add some slight randomness for realistic variation taking building mass into account
                offset += random.uniform(-0.5, 1.5)
                lst_offsets.append(offset)
                svf_scores.append(float(f"{svf:.2f}"))
                pedestrian_proxies.append(ped_score)
                roof_proxies.append(r_type)
                
            buildings['hvi_offset'] = lst_offsets
            buildings['svf'] = svf_scores
            buildings['pedestrian_proxy'] = pedestrian_proxies
            buildings['roof_type'] = roof_proxies
            
            # Convert NaN to None for JSON serialization
            buildings = buildings.fillna('')
            buildings_json = json.loads(buildings.to_json())
        else:
            buildings_json = {"type": "FeatureCollection", "features": []}

        # Format other layers for JSON output
        if not roads.empty:
            roads = roads[['geometry', 'highway']]
            roads_json = json.loads(roads.to_json())
        else:
            roads_json = {"type": "FeatureCollection", "features": []}

        if not parks.empty:
            parks = parks[['geometry']]
            parks_json = json.loads(parks.to_json())
        else:
            parks_json = {"type": "FeatureCollection", "features": []}

        if not water.empty:
            water = water[['geometry']]
            water_json = json.loads(water.to_json())

        else:
            water_json = {"type": "FeatureCollection", "features": []}

        import time
        return {
            "center": [lng, lat],
            "timestamp": time.time(),
            "buildings": buildings_json,
            "roads": roads_json,
            "parks": parks_json,
            "water": water_json,
        }
    except Exception as e:
        print(f"OSM Error: {e}")
        return {"error": str(e)}
