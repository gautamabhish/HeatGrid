import ee
import os
import osmnx as ox
from google.oauth2 import service_account

def init_ee():
    """
    Initialize Earth Engine API using a Service Account JSON.
    """
    try:
        credentials_path = os.getenv("GEE_CREDENTIALS_PATH")
        if credentials_path and os.path.exists(credentials_path):
            credentials = service_account.Credentials.from_service_account_file(credentials_path)
            # Earth Engine requires the 'https://www.googleapis.com/auth/earthengine' scope
            scoped_credentials = credentials.with_scopes(['https://www.googleapis.com/auth/earthengine'])
            ee.Initialize(scoped_credentials)
            print("Successfully initialized Google Earth Engine with Service Account.")
        else:
            # Fallback to local auth if running locally or not provided
            ee.Initialize()
            print("Initialized Google Earth Engine with local/default auth.")
    except Exception as e:
        print("Warning: Earth Engine not authenticated. Using mock data. Error:", e)

async def get_gee_data(city_name: str):
    """
    Fetch real Landsat LST and Sentinel/Landsat NDVI data for the city using Earth Engine.
    """
    init_ee()
    
    try:
        # 1. Geocode the requested city to a BoundingBox using osmnx
        ox.settings.user_agent = 'AnyCityHeatMapper/1.0'
        # use geocode_to_gdf to get the geometry and bounds
        gdf = ox.geocode_to_gdf(city_name)
        bbox = gdf.total_bounds # [minx, miny, maxx, maxy] -> [lon_min, lat_min, lon_max, lat_max]
        lon_min, lat_min, lon_max, lat_max = bbox
        
        region = ee.Geometry.BBox(lon_min, lat_min, lon_max, lat_max)
        
        # 2. Query MODIS LST (MOD11A2: 8-Day Global 1km) for July average
        # Using July 2023 as a reliable summer baseline
        dataset_lst = ee.ImageCollection("MODIS/061/MOD11A2") \
            .filterDate('2023-07-01', '2023-07-31') \
            .select('LST_Day_1km')
        
        # MODIS LST is in Kelvin scaled by 0.02. Convert to Celsius.
        lst_image = dataset_lst.mean().multiply(0.02).subtract(273.15).clip(region)
        
        # 3. Query MODIS NDVI (MOD13A2: 16-Day Global 1km)
        dataset_ndvi = ee.ImageCollection("MODIS/061/MOD13A2") \
            .filterDate('2023-07-01', '2023-07-31') \
            .select('NDVI')
        
        # MODIS NDVI is scaled by 0.0001
        ndvi_image = dataset_ndvi.mean().multiply(0.0001).clip(region)
        
        # 4. Return aggregated metrics
        lst_dict = lst_image.reduceRegion(
            reducer=ee.Reducer.mean(),
            geometry=region,
            scale=1000,
            maxPixels=1e9
        ).getInfo()
        
        ndvi_dict = ndvi_image.reduceRegion(
            reducer=ee.Reducer.mean(),
            geometry=region,
            scale=1000,
            maxPixels=1e9
        ).getInfo()
        
        avg_lst = lst_dict.get('LST_Day_1km')
        avg_ndvi = ndvi_dict.get('NDVI')
        
        if avg_lst is None: avg_lst = 32.5
        if avg_ndvi is None: avg_ndvi = 0.25
        
        # Export map link URLs for frontend integration
        lst_vis = {'min': 20, 'max': 45, 'palette': ['blue', 'yellow', 'red']}
        lst_map_id = lst_image.getMapId(lst_vis)
        
        ndvi_vis = {'min': 0, 'max': 1, 'palette': ['white', 'green']}
        ndvi_map_id = ndvi_image.getMapId(ndvi_vis)
        
        return {
            "bbox": [lon_min, lat_min, lon_max, lat_max],
            "avg_lst_celsius": round(float(avg_lst), 2),
            "avg_ndvi": round(float(avg_ndvi), 2),
            "layers": {
                "heatmap_url": lst_map_id['tile_fetcher'].url_format,
                "ndvi_url": ndvi_map_id['tile_fetcher'].url_format
            }
        }
    except Exception as e:
        print("GEE Data fetch error:", e)
        # Fallback to mock data if GEE fails (e.g. unauthenticated)
        # Get approx coords if osmnx worked, else use default SF
        try:
            ox.settings.user_agent = 'AnyCityHeatMapper/1.0'
            lat, lon = ox.geocode(city_name)
            bbox = [lon - 0.02, lat - 0.02, lon + 0.02, lat + 0.02]
        except:
            bbox = [-122.4194, 37.7749, -122.38, 37.81]
            
        return {
            "bbox": bbox,
            "avg_lst_celsius": 32.5,
            "avg_ndvi": 0.25,
            "layers": {
                "heatmap_url": "mock_heatmap_tile_url",
                "ndvi_url": "mock_ndvi_tile_url"
            }
        }
