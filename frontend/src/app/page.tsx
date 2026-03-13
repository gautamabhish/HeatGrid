'use client';

import { useState, useEffect } from 'react';
import { Group, Panel, Separator } from 'react-resizable-panels';
import InterventionSidebar from '@/components/InterventionSidebar';
import MapViewer from '@/components/MapViewer';
import SearchBar from '@/components/SearchBar';
import LayerToggle, { type ActiveLayer } from '@/components/LayerToggle';
import ControlPanel from '@/components/ControlPanel';

export default function Dashboard() {
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [cityData, setCityData] = useState<any>(null);
  const [cityName, setCityName] = useState('');
  const [selectedFeature, setSelectedFeature] = useState<any>(null);
  const [activeLayers, setActiveLayers] = useState<Set<ActiveLayer>>(new Set(['heat']));

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () =>
      setIsMobile(window.matchMedia('(max-width:1024px)').matches);

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const [simulationState, setSimulationState] = useState<Record<string, number>>({});

  const handleSearch = async (placeName: string, lat: number, lng: number) => {
    if (!placeName.trim()) return;

    setLoading(true);
    setSelectedFeature(null);
    setSimulationState({});
    setLoadingMessage('Initializing analysis...');

    try {
      const response = await fetch('http://localhost:8000/api/analyze-city', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ city_name: placeName, lat, lng }),
      });

      if (!response.ok) throw new Error(`HTTP error ${response.status}`);

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split('\n');
          buffer = parts.pop() || '';

          for (const part of parts) {
            if (!part.trim()) continue;

            try {
              const chunk = JSON.parse(part);

              if (chunk.status === 'loading') {
                setLoadingMessage(chunk.message);
              }

              if (chunk.status === 'success') {
                const data = chunk.data;
                setCityData(data);
                setCityName(chunk.city || placeName);

                if (data?.ai_interventions) {
                  const sim: Record<string, number> = {};
                  data.ai_interventions.forEach((inv: any) => {
                    sim[inv.type] = 0;
                  });
                  setSimulationState(sim);
                }
              }

              if (chunk.status === 'error') {
                throw new Error(chunk.message);
              }
            } catch (e) {
              console.error('Chunk parse error', e);
            }
          }
        }
      }
    } catch (err) {
      console.error(err);
      alert('Backend error. Ensure FastAPI server is running.');
    } finally {
      setLoading(false);
    }
  };

  const handleLayerToggle = (layer: ActiveLayer) => {
    setActiveLayers(prev => {
      const next = new Set(prev);
      next.has(layer) ? next.delete(layer) : next.add(layer);
      return next;
    });
  };

  const handleSimChange = (type: string, val: number) => {
    setSimulationState(prev => ({ ...prev, [type]: val }));
  };

  return (
    <main className="flex h-[100dvh] w-full bg-slate-950 text-slate-50 relative">

      {loading && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur">
          <div className="glass-panel p-8 rounded-3xl flex flex-col items-center">
            <div className="w-16 h-16 border-4 border-slate-700 border-t-emerald-500 rounded-full animate-spin mb-6" />
            <h3 className="text-xl font-bold mb-2">Analyzing Data</h3>
            <p className="text-emerald-400 animate-pulse">{loadingMessage}</p>
          </div>
        </div>
      )}

      <div className={`w-full h-full flex ${isMobile ? 'flex-col' : 'flex-row'} overflow-hidden`}>
        {/* MAP PANEL */}
        <div className={`relative ${isMobile ? 'h-[45vh] w-full' : 'flex-1 h-full'}`}>
          <div className="absolute top-6 left-6 z-20 w-[clamp(240px,30vw,420px)] pointer-events-auto">
            <SearchBar onSearch={handleSearch} loading={loading} />
          </div>

          <div className="absolute top-6 right-6 z-20 pointer-events-auto">
            <LayerToggle activeLayers={activeLayers} osmData={cityData?.osm_features} onToggle={handleLayerToggle} />
          </div>

          <div className="absolute inset-0 z-0 pl-0">
            <MapViewer
              osmData={cityData?.osm_features}
              geeData={cityData?.gee_metrics}
              activeLayers={activeLayers}
              simulationState={simulationState}
              onSelectFeature={setSelectedFeature}
            />
          </div>

          {cityData && !isMobile && (
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-[min(92vw,1200px)] z-30 pointer-events-auto">
              <ControlPanel
                interventions={cityData.ai_interventions || []}
                simulationState={simulationState}
                onSimChange={handleSimChange}
                cityAvgLST={cityData?.gee_metrics?.avg_lst_celsius || 0}
              />
            </div>
          )}
        </div>

        {/* SIDEBAR CONTAINER */}
        <div className={`${isMobile ? 'flex-1 w-full' : 'w-[420px] 2xl:w-[500px] h-full'} flex flex-col bg-slate-950 border-t ${!isMobile && 'border-t-0 border-l'} border-white/10 shadow-2xl z-10 shrink-0`}>
          <div className="flex-1 w-full h-full overflow-y-auto overflow-x-hidden flex flex-col">
            {isMobile && cityData && (
              <div className="border-b border-slate-800 p-2 shrink-0">
                <ControlPanel
                  interventions={cityData.ai_interventions || []}
                  simulationState={simulationState}
                  onSimChange={handleSimChange}
                  cityAvgLST={cityData?.gee_metrics?.avg_lst_celsius || 0}
                />
              </div>
            )}

            <InterventionSidebar
              city={cityName}
              avgLST={cityData?.gee_metrics?.avg_lst_celsius || 0}
              avgNDVI={cityData?.gee_metrics?.avg_ndvi || 0}
              interventions={cityData?.ai_interventions || []}
              overallSummary={cityData?.overall_summary || ''}
              sunExposedSide={cityData?.sun_exposed_side || ''}
              treeRecommendationSide={cityData?.tree_recommendation_side || ''}
              shadowMsg={cityData?.shadow_msg || ''}
              zoneCounts={cityData?.zone_counts || {}}
              selectedFeature={selectedFeature}
              simulationState={simulationState}
              onSimChange={handleSimChange}
              loading={loading}
            />
          </div>
        </div>
      </div>
    </main>
  );
}