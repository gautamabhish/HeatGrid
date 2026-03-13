# Any City Heat Mapper

An AI-powered urban planning tool that analyzes heat islands and suggests cooling interventions.

## Architecture
- **Backend:** FastAPI, `geopandas`, `osmnx` (Mocked MVP)
- **Frontend:** Next.js (App Router), `react-map-gl`, `maplibre-gl`, Tailwind CSS

## Prerequisites
1. Python 3.10+
2. Node.js 18+
3. Google Earth Engine Service Account (for future actual satellite image pulls). 
*Note: Mapbox has been replaced with MapLibre, so no map token is required!*

## Getting Started

### 1. Start the Backend
```bash
cd backend
python3 -m venv venv  # (If not already created)
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```
*API will run at http://localhost:8000*

### 2. Start the Frontend
```bash
cd frontend
npm install
npm run dev
```
*App will run at http://localhost:3000*

## How to Test the MVP
1. Open the frontend URL.
2. In the top-left search bar, type a Place name (e.g., "NIT HAMIRPUR").
3. The backend will return mock footprint data with simulated High Heat features.
4. Click on the 3D extruded buildings on the map to view the "Street Report Card" and AI-suggested cooling interventions.
