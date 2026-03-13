import httpx

async def get_current_weather(lat: float, lng: float):
    """
    Fetch baseline current weather for the city center using Open-Meteo.
    """
    url = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lng}&current_weather=true"
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(url, timeout=10.0)
            response.raise_for_status()
            data = response.json()
            return {
                "temperature": data["current_weather"]["temperature"],
                "windspeed": data["current_weather"]["windspeed"],
                "is_day": data["current_weather"]["is_day"]
            }
        except Exception as e:
            print(f"Weather Fetch Error: {e}")
            # Fallback mock baseline if API fails
            return {
                "temperature": 30.0,
                "windspeed": 5.0,
                "is_day": 1
            }
