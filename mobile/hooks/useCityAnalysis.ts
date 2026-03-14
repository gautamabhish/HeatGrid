import { useState, useCallback } from 'react';
import { API_BASE_URL } from '@/constants/theme';

export interface InterventionData {
  type: string;
  icon?: string;
  target: string;
  impact_estimate: string;
  cost_estimate: string;
  roi_score?: number;
  priority_label?: string;
  narrative?: string;
  engineering_insight?: string;
}

export interface GeeMetrics {
  avg_lst_celsius: number;
  avg_ndvi: number;
}

export interface CityData {
  gee_metrics: GeeMetrics;
  weather: Record<string, any>;
  osm_features: Record<string, any>;
  ai_interventions: InterventionData[];
  overall_summary: string;
  sun_exposed_side: string;
  tree_recommendation_side: string;
  shadow_msg: string;
  zone_counts: Record<string, number>;
}

export function useCityAnalysis() {
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [cityData, setCityData] = useState<CityData | null>(null);
  const [cityName, setCityName] = useState('');
  const [selectedFeature, setSelectedFeature] = useState<any>(null);
  const [simulationState, setSimulationState] = useState<Record<string, number>>({});
  const [activeLayers, setActiveLayers] = useState<Set<string>>(new Set(['heat']));

  const handleSearch = useCallback(async (placeName: string, lat: number, lng: number) => {
    if (!placeName.trim()) return;

    setLoading(true);
    setSelectedFeature(null);
    setSimulationState({});
    setLoadingMessage('Initializing analysis...');
    setCityData(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/analyze-city`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ city_name: placeName, lat, lng }),
      });

      if (!response.ok) throw new Error(`HTTP error ${response.status}`);

      const text = await response.text();
      const lines = text.split('\n').filter(l => l.trim());

      for (const line of lines) {
        try {
          const chunk = JSON.parse(line);

          if (chunk.status === 'loading') {
            setLoadingMessage(chunk.message);
          }

          if (chunk.status === 'success') {
            const data: CityData = chunk.data;
            setCityData(data);
            setCityName(chunk.city || placeName);

            if (data?.ai_interventions) {
              const sim: Record<string, number> = {};
              data.ai_interventions.forEach((inv: InterventionData) => {
                sim[inv.type] = 0;
              });
              setSimulationState(sim);
            }
          }

          if (chunk.status === 'error') {
            throw new Error(chunk.message);
          }
        } catch (e) {
          // Skip parse errors for status chunks
        }
      }
    } catch (err) {
      console.error(err);
      alert('Backend error. Ensure FastAPI server is running at ' + API_BASE_URL);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSimChange = useCallback((type: string, val: number) => {
    setSimulationState(prev => ({ ...prev, [type]: val }));
  }, []);

  const handleLayerToggle = useCallback((layer: string) => {
    setActiveLayers(prev => {
      const next = new Set(prev);
      next.has(layer) ? next.delete(layer) : next.add(layer);
      return next;
    });
  }, []);

  return {
    loading,
    loadingMessage,
    cityData,
    cityName,
    selectedFeature,
    setSelectedFeature,
    simulationState,
    activeLayers,
    handleSearch,
    handleSimChange,
    handleLayerToggle,
  };
}
