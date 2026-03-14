'use client';

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import Map, { Source, Layer } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { ActiveLayer } from './LayerToggle';
import { RotateCcw, X } from 'lucide-react';

interface MapViewerProps {
  osmData: any | null;
  geeData: any | null;
  activeLayers: Set<ActiveLayer>;
  simulationState: Record<string, number>;
  onSelectFeature?: (feature: any) => void;
  onResetLayers?: () => void;
}

// Zone tooltip explanations
const LEGEND_TOOLTIPS: Record<string, string> = {
  misting_zone: 'Areas chosen by AI for atomized water misting (High Heat + High Foot Traffic).',
  reflective_roof_zone: 'Areas recommended for high-albedo roof coatings to reflect solar radiation.',
  green_corridor_zone: 'Streets selected for dense tree planting (Low NDVI + Hot).',
  none: 'Default heat zones experiencing above-average temperatures.',
};

// Zone label config
const ZONE_CONFIG = [
  { id: 'misting_zone', color: '#22d3ee', label: 'Misting Zone', outlineKey: 'heat' as ActiveLayer },
  { id: 'reflective_roof_zone', color: '#f472b6', label: 'Reflective Roof', outlineKey: 'roofs' as ActiveLayer },
  { id: 'green_corridor_zone', color: '#a78bfa', label: 'Green Corridor', outlineKey: 'trees' as ActiveLayer },
  { id: 'none', color: '#ef4444', label: 'Heat Hotspot', outlineKey: 'heat' as ActiveLayer },
];

export default function MapViewer({
  osmData, geeData, activeLayers, simulationState, onSelectFeature, onResetLayers
}: MapViewerProps) {
  const [viewState, setViewState] = useState({
    longitude: 77.2090,
    latitude: 28.6139,
    zoom: 13,
    pitch: 50,
    bearing: -10,
  });

  // Hover tooltip state
  const [hoverInfo, setHoverInfo] = useState<{
    x: number; y: number;
    temp: number; zone: string; svf: number; pedScore: number; name: string;
  } | null>(null);

  // Selected building ID for highlight
  const [selectedId, setSelectedId] = useState<string | number | null>(null);

  // First-time guide state
  const [showGuide, setShowGuide] = useState(false);
  const guideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const shown = localStorage.getItem('mapGuideShown');
      if (!shown) {
        setShowGuide(true);
        guideTimerRef.current = setTimeout(() => {
          setShowGuide(false);
          localStorage.setItem('mapGuideShown', '1');
        }, 9000);
      }
    }
    return () => {
      if (guideTimerRef.current) clearTimeout(guideTimerRef.current);
    };
  }, []);

  const dismissGuide = useCallback(() => {
    setShowGuide(false);
    if (guideTimerRef.current) clearTimeout(guideTimerRef.current);
    localStorage.setItem('mapGuideShown', '1');
  }, []);

  useEffect(() => {
    if (osmData?.center) {
      setViewState(prev => ({
        ...prev,
        longitude: osmData.center[0],
        latitude: osmData.center[1],
        zoom: 14.5,
      }));
    }
  }, [osmData?.center, osmData?.timestamp]);

  // Compute total temperature reduction from simulation sliders
  const totalReduction = useMemo(() => {
    let reduction = 0;
    if (!simulationState) return 0;
    Object.entries(simulationState).forEach(([type, value]) => {
      const t = type.toLowerCase();
      if (t.includes('canopy') || t.includes('tree')) reduction += value * 0.05;
      else if (t.includes('roof')) reduction += value * 0.04;
      else if (t.includes('mist')) reduction += value * 0.002;
      else if (t.includes('corridor')) reduction += value * 0.1;
      else if (t.includes('pavement')) reduction += value * 0.015;
      else reduction += value * 0.02;
    });
    return reduction;
  }, [simulationState]);

  const adjustedBuildings = useMemo(() => {
    if (!osmData?.buildings) return null;
    if (totalReduction === 0) return osmData.buildings;
    return {
      ...osmData.buildings,
      features: osmData.buildings.features.map((f: any) => ({
        ...f,
        properties: {
          ...f.properties,
          simulated_lst: Math.max(0, (f.properties.simulated_lst || 0) - totalReduction),
        },
      })),
    };
  }, [osmData, totalReduction]);

  // ─── VISUAL CHANNEL 1: Fill Color = Temperature (gray when heatmap off) ───
  const buildingColorExpr = useMemo(() => {
    return activeLayers.has('heat') ? [
      'interpolate', ['linear'],
      ['get', 'simulated_lst'],
      28, '#fcd34d',
      32, '#f97316',
      36, '#ef4444',
      40, '#7f1d1d'
    ] : '#334155'; // gray when heatmap toggled off
  }, [activeLayers]);

  // ─── VISUAL CHANNEL 2: Outline Color = AI Zone (independent per toggle) ───
  const buildingOutlineExpr = useMemo(() => {
    const showMisting = activeLayers.has('heat');
    const showRoofs = activeLayers.has('roofs');
    const showCorridors = activeLayers.has('corridors') || activeLayers.has('trees');

    return [
      'case',
      ['==', ['get', 'intervention_zone'], 'misting_zone'],
        showMisting ? '#22d3ee' : 'rgba(0,0,0,0)',
      ['==', ['get', 'intervention_zone'], 'reflective_roof_zone'],
        showRoofs ? '#f472b6' : 'rgba(0,0,0,0)',
      ['==', ['get', 'intervention_zone'], 'green_corridor_zone'],
        showCorridors ? '#a78bfa' : 'rgba(0,0,0,0)',
      // Heat hotspot (zone === 'none') always shows red outline when heatmap is on
      ['==', ['get', 'intervention_zone'], 'none'],
        showMisting ? '#ef4444' : 'rgba(0,0,0,0)',
      'rgba(0,0,0,0)'
    ];
  }, [activeLayers]);

  // ─── Selected building highlight expression ───
  const selectedOutlineExpr = useMemo(() => {
    if (selectedId === null) return 'rgba(0,0,0,0)';
    return [
      'case',
      ['==', ['id'], selectedId], '#ffffff',
      'rgba(0,0,0,0)'
    ];
  }, [selectedId]);

  // ─── Layer definitions ───

  const buildingLayer: any = {
    id: 'buildings',
    type: 'fill-extrusion',
    source: 'osm-buildings',
    paint: {
      'fill-extrusion-color': buildingColorExpr,
      'fill-extrusion-height': [
        'case',
        ['has', 'building:levels'],
        ['*', ['to-number', ['get', 'building:levels']], 3],
        12
      ],
      'fill-extrusion-base': 0,
      'fill-extrusion-opacity': 0.9,
      'fill-extrusion-color-transition': { duration: 600, delay: 0 },
    },
  };

  const aiZoneOutlineLayer: any = {
    id: 'ai-zone-outlines',
    type: 'line',
    source: 'osm-buildings',
    paint: {
      'line-color': buildingOutlineExpr,
      'line-width': 2.5,
      'line-opacity': 1,
    },
  };

  const selectedOutlineLayer: any = {
    id: 'selected-outline',
    type: 'line',
    source: 'osm-buildings',
    paint: {
      'line-color': selectedOutlineExpr,
      'line-width': 4,
      'line-opacity': 1,
    },
  };

  const buildingLabelLayer: any = {
    id: 'building-labels',
    type: 'symbol',
    source: 'osm-buildings',
    minzoom: 15,
    layout: {
      'text-field': ['get', 'name'],
      'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
      'text-size': 10,
      'text-anchor': 'center',
      'text-justify': 'center',
    },
    paint: {
      'text-color': '#e2e8f0',
      'text-halo-color': '#0f172a',
      'text-halo-width': 1.5,
    }
  };

  const corridorRoadLayer: any = {
    id: 'roads-corridor',
    type: 'line',
    source: 'osm-roads',
    paint: {
      'line-color': '#a78bfa',
      'line-width': 5,
      'line-opacity': 0.8,
    },
  };

  const defaultRoadLayer: any = {
    id: 'roads',
    type: 'line',
    source: 'osm-roads',
    paint: {
      'line-color': [
        'match',
        ['get', 'highway'],
        ['motorway', 'trunk', 'primary'], '#64748b',
        ['secondary', 'tertiary'], '#475569',
        '#334155'
      ],
      'line-width': [
        'match',
        ['get', 'highway'],
        ['motorway', 'trunk', 'primary'], 4,
        ['secondary', 'tertiary'], 2.5,
        1.5
      ],
      'line-opacity': 0.65,
    },
  };

  // ─── Interaction handlers ───

  const onClick = useCallback((event: any) => {
    const feature = event.features?.[0];
    if (feature) {
      setSelectedId(feature.id ?? null);
      if (onSelectFeature) onSelectFeature(feature);
    } else {
      setSelectedId(null);
    }
  }, [onSelectFeature]);

  const onMouseEnter = useCallback((event: any) => {
    const feature = event.features?.[0];
    if (!feature) return;
    const p = feature.properties || {};
    setHoverInfo({
      x: event.point.x,
      y: event.point.y,
      temp: parseFloat(p.simulated_lst || 0),
      zone: p.intervention_zone || 'none',
      svf: parseFloat(p.svf || 1),
      pedScore: parseInt(p.pedestrian_proxy || 1),
      name: p.name || p.highway || 'Building',
    });
  }, []);

  const onMouseMove = useCallback((event: any) => {
    const feature = event.features?.[0];
    if (!feature) {
      setHoverInfo(null);
      return;
    }
    const p = feature.properties || {};
    setHoverInfo({
      x: event.point.x,
      y: event.point.y,
      temp: parseFloat(p.simulated_lst || 0),
      zone: p.intervention_zone || 'none',
      svf: parseFloat(p.svf || 1),
      pedScore: parseInt(p.pedestrian_proxy || 1),
      name: p.name || p.highway || 'Building',
    });
  }, []);

  const onMouseLeave = useCallback(() => {
    setHoverInfo(null);
  }, []);

  // Zone display label
  const getZoneLabel = (zone: string) => {
    switch (zone) {
      case 'misting_zone': return '💧 Misting Zone';
      case 'reflective_roof_zone': return '🏠 Reflective Roof';
      case 'green_corridor_zone': return '🌿 Green Corridor';
      case 'none': return '🔥 Heat Hotspot';
      default: return zone;
    }
  };

  const getZoneColor = (zone: string) => {
    const found = ZONE_CONFIG.find(z => z.id === zone);
    return found?.color ?? '#94a3b8';
  };

  // Active layers list for status indicator
  const LAYER_LABELS: Record<ActiveLayer, string> = {
    heat: 'Heatmap',
    trees: 'Trees',
    roofs: 'Roofs',
    corridors: 'Corridors',
  };

  return (
    <div className="w-full h-full relative">

      {/* ── First-Time Map Guide ── */}
      {showGuide && (
        <div className="absolute inset-0 z-40 pointer-events-none flex items-end justify-center pb-32">
          <div
            className="pointer-events-auto bg-slate-900/95 border border-slate-600/60 backdrop-blur-xl rounded-2xl px-6 py-5 shadow-2xl max-w-sm w-full mx-4 animate-fade-in-up"
            style={{ animation: 'fadeInUp 0.5s ease' }}
          >
            <div className="flex items-start justify-between mb-3">
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest">Map Guide</span>
              <button
                onClick={dismissGuide}
                className="text-slate-500 hover:text-slate-300 transition-colors"
              >
                <X size={14} />
              </button>
            </div>
            <div className="space-y-2.5 text-sm text-slate-300">
              <div className="flex items-start gap-2.5">
                <span className="text-lg leading-none">1️⃣</span>
                <span><strong className="text-white">Red buildings</strong> are heat hotspots — color = temperature</span>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="text-lg leading-none">2️⃣</span>
                <span><strong className="text-white">Colored outlines</strong> show AI cooling strategies (cyan, pink, purple)</span>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="text-lg leading-none">3️⃣</span>
                <span>Use <strong className="text-white">layer toggles</strong> to explore different solutions</span>
              </div>
            </div>
            <div className="mt-3 text-[10px] text-slate-600 text-right">Auto-dismisses in a few seconds</div>
          </div>
        </div>
      )}

      {/* ── Main Map ── */}
      <Map
        {...viewState}
        onMove={evt => setViewState(evt.viewState)}
        mapStyle="https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"
        interactiveLayerIds={osmData ? ['buildings'] : []}
        onClick={onClick}
        onMouseEnter={onMouseEnter}
        onMouseMove={onMouseMove}
        onMouseLeave={onMouseLeave}
        cursor={hoverInfo ? 'pointer' : 'grab'}
      >
        {/* Water */}
        {osmData?.water && (
          <Source id="osm-water" type="geojson" data={osmData.water}>
            <Layer id="water" type="fill" paint={{ 'fill-color': '#0369a1', 'fill-opacity': 0.75 }} />
          </Source>
        )}

        {/* Parks */}
        {osmData?.parks && (
          <Source id="osm-parks" type="geojson" data={osmData.parks}>
            <Layer
              id="parks"
              type="fill"
              paint={{
                'fill-color': activeLayers.has('trees') ? '#059669' : '#166534',
                'fill-opacity': activeLayers.has('trees') ? 0.75 : 0.5
              }}
            />
          </Source>
        )}

        {/* Roads — always show default, overlay corridor roads when active */}
        {osmData?.roads && (
          <Source id="osm-roads" type="geojson" data={osmData.roads}>
            <Layer {...defaultRoadLayer} />
            {activeLayers.has('corridors') && <Layer {...corridorRoadLayer} />}
          </Source>
        )}

        {/* Buildings */}
        {adjustedBuildings && (
          <Source id="osm-buildings" type="geojson" data={adjustedBuildings}>
            <Layer {...buildingLayer} />
            <Layer {...aiZoneOutlineLayer} />
            <Layer {...selectedOutlineLayer} />
            <Layer {...buildingLabelLayer} />
          </Source>
        )}
      </Map>

      {/* ── Hover Tooltip ── */}
      {hoverInfo && (
        <div
          className="absolute z-30 pointer-events-none"
          style={{ left: hoverInfo.x + 12, top: hoverInfo.y - 10 }}
        >
          <div className="bg-slate-900/95 border border-slate-600/60 backdrop-blur-md rounded-xl px-3.5 py-3 shadow-2xl text-xs min-w-[180px]">
            <div className="font-semibold text-white mb-2 text-[11px] truncate max-w-[160px]">
              {hoverInfo.name}
            </div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-slate-400">Temp</span>
              <span
                className="font-bold ml-auto"
                style={{ color: hoverInfo.temp > 36 ? '#ef4444' : hoverInfo.temp > 32 ? '#f97316' : '#fcd34d' }}
              >
                {hoverInfo.temp.toFixed(1)}°C
              </span>
            </div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-slate-400">Zone</span>
              <span className="ml-auto font-medium" style={{ color: getZoneColor(hoverInfo.zone) }}>
                {getZoneLabel(hoverInfo.zone)}
              </span>
            </div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-slate-400">Sky View</span>
              <span className="ml-auto text-slate-300">{hoverInfo.svf.toFixed(2)}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-400">Ped. Score</span>
              <span className="ml-auto text-slate-300">{hoverInfo.pedScore}/10</span>
            </div>
          </div>
        </div>
      )}

      {/* ── Bottom-left: Full Legend ── */}
      {osmData && (
        <div className="absolute top-24 left-4 z-20 bg-slate-900/85 backdrop-blur-md rounded-2xl px-3.5 py-3 border border-slate-700/50 text-xs text-slate-300 shadow-2xl space-y-3 max-w-[190px]">
          {/* Temperature */}
          <div>
            <div className="font-bold text-slate-200 uppercase tracking-wider text-[9px] mb-1.5">Temperature</div>
            <div className="space-y-1">
              {[
                { color: '#fcd34d', label: 'Mild Heat (28°C)' },
                { color: '#f97316', label: 'Warm (32°C)' },
                { color: '#ef4444', label: 'Hot (36°C)' },
                { color: '#7f1d1d', label: 'Extreme (40°C+)' },
              ].map(item => (
                <div key={item.label} className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: item.color }} />
                  <span className="text-[10px]">{item.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="h-px bg-slate-700/60" />

          {/* AI Cooling Zones */}
          <div>
            <div className="font-bold text-slate-200 uppercase tracking-wider text-[9px] mb-1.5">AI Cooling Zones</div>
            <div className="space-y-1">
              {ZONE_CONFIG.map(z => (
                <div
                  key={z.id}
                  className="flex items-center gap-2 cursor-help"
                  title={LEGEND_TOOLTIPS[z.id]}
                >
                  <div
                    className="w-2.5 h-2.5 rounded-sm shrink-0 border-2"
                    style={{ backgroundColor: 'transparent', borderColor: z.color }}
                  />
                  <span className="text-[10px]">{z.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="h-px bg-slate-700/60" />

          {/* Infrastructure */}
          <div>
            <div className="font-bold text-slate-200 uppercase tracking-wider text-[9px] mb-1.5">Infrastructure</div>
            <div className="space-y-1">
              {[
                { color: '#166534', label: 'Parks' },
                { color: '#0369a1', label: 'Water' },
                { color: '#475569', label: 'Roads' },
                { color: '#a78bfa', label: 'Green Corridor' },
              ].map(item => (
                <div key={item.label} className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: item.color }} />
                  <span className="text-[10px]">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Bottom-center: Temperature Scale Bar ── */}
      {/* {osmData && activeLayers.has('heat') && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
          <div className="bg-slate-900/85 backdrop-blur-md rounded-xl px-4 py-2 border border-slate-700/50 shadow-xl">
            <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 text-center">Temperature Scale</div>
            <div
              className="h-3 rounded-full w-48"
              style={{
                background: 'linear-gradient(to right, #fcd34d, #f97316, #ef4444, #7f1d1d)'
              }}
            />
            <div className="flex justify-between text-[9px] text-slate-400 mt-1 px-0.5">
              <span>28°C</span>
              <span>32°C</span>
              <span>36°C</span>
              <span>40°C+</span>
            </div>
          </div>
        </div>
      )} */}

      {/* ── Top-right (below layer toggles): Active Layers Status + Reset ── */}
      {osmData && (
        <div className="absolute top-[86px] right-6 z-20 pointer-events-auto">
          <div className="bg-slate-900/85 backdrop-blur-md rounded-xl px-3 py-2.5 border border-slate-700/50 shadow-xl text-xs text-slate-300 min-w-[140px]">
            <div className="font-bold text-slate-200 uppercase tracking-wider text-[9px] mb-2">Active Layers</div>
            <div className="space-y-1">
              {(Object.entries(LAYER_LABELS) as [ActiveLayer, string][]).map(([key, label]) => (
                <div key={key} className="flex items-center justify-between gap-3">
                  <span className="text-[10px]">{label}</span>
                  <span className={`text-[10px] font-bold ${activeLayers.has(key) ? 'text-emerald-400' : 'text-slate-600'}`}>
                    {activeLayers.has(key) ? '✓' : '✗'}
                  </span>
                </div>
              ))}
            </div>
            {onResetLayers && (
              <button
                onClick={onResetLayers}
                className="mt-2.5 w-full flex items-center justify-center gap-1.5 text-[10px] font-semibold text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-700/60 rounded-lg py-1.5 border border-slate-700/40 transition-all duration-200"
                title="Reset to heatmap only"
              >
                <RotateCcw size={10} />
                Reset View
              </button>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
