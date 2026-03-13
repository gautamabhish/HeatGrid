'use client';

import { useState, useMemo, useEffect } from 'react';
import Map, { Source, Layer } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { ActiveLayer } from './LayerToggle';

interface MapViewerProps {
  osmData: any | null;
  geeData: any | null;
  activeLayers: Set<ActiveLayer>;
  simulationState: Record<string, number>;
  onSelectFeature?: (feature: any) => void;
}

// Zone color mapping
const ZONE_COLORS: Record<string, string> = {
  misting_zone: '#3b82f6',          // blue
  reflective_roof_zone: '#f97316',  // orange
  green_corridor_zone: '#10b981',   // emerald
  none: '#ef4444',                  // red (heat default)
};

// Tooltip definitions to remove ambiguity
const LEGEND_TOOLTIPS: Record<string, string> = {
  misting_zone: 'Areas chosen by AI for atomized water misting (High Heat + High Foot Traffic).',
  reflective_roof_zone: 'Areas recommended for high-albedo roof coatings to reflect solar radiation (Dark roofs or deep canyons).',
  green_corridor_zone: 'Streets selected for dense tree planting to provide shade and evapotranspiration (Low NDVI + Hot).',
  none: 'Default heat zones experiencing above-average temperatures without specific infrastructure tags yet.'
};

function buildBuildingColorExpr(activeLayers: any) {
  const hasLayer = (layer: string) => activeLayers && typeof activeLayers.has === 'function' ? activeLayers.has(layer) : false;

  if (hasLayer('trees') && !hasLayer('heat')) return '#10b981';
  if (hasLayer('roofs') && !hasLayer('heat')) return '#f97316';
  if (hasLayer('corridors') && !hasLayer('heat')) return '#06b6d4';

  // Default: color by intervention zone, modulated by simulated_lst
  return [
    'case',
    ['==', ['get', 'intervention_zone'], 'misting_zone'],
    '#3b82f6',
    ['==', ['get', 'intervention_zone'], 'reflective_roof_zone'],
    '#f97316',
    ['==', ['get', 'intervention_zone'], 'green_corridor_zone'],
    '#10b981',
    // Default heat-based gradient
    [
      'interpolate', ['linear'],
      ['get', 'simulated_lst'],
      28, '#fcd34d',
      32, '#f97316',
      36, '#ef4444',
      40, '#7f1d1d'
    ]
  ];
}

export default function MapViewer({ osmData, geeData, activeLayers, simulationState, onSelectFeature }: MapViewerProps) {
  const [viewState, setViewState] = useState({
    longitude: 77.2090,
    latitude: 28.6139,
    zoom: 13,
    pitch: 50,
    bearing: -10,
  });

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

  // Dynamically calculate the total temperature reduction based on active simulation state
  const totalReduction = useMemo(() => {
    let reduction = 0;
    if (!simulationState) return 0;
    
    // Map intervention names/types back to approx multipliers (same as ControlPanel rules roughly)
    Object.entries(simulationState).forEach(([type, value]) => {
      const typeLower = type.toLowerCase();
      if (typeLower.includes('canopy') || typeLower.includes('tree')) reduction += value * 0.05;
      else if (typeLower.includes('roof')) reduction += value * 0.04;
      else if (typeLower.includes('mist')) reduction += value * 0.002;
      else if (typeLower.includes('corridor')) reduction += value * 0.1;
      else if (typeLower.includes('pavement')) reduction += value * 0.015;
      else reduction += value * 0.02; // generic fallback
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

  const buildingColorExpr = useMemo(() => buildBuildingColorExpr(activeLayers), [activeLayers]);

  const showBuildings = !activeLayers.size || activeLayers.has('heat') || activeLayers.has('roofs') || activeLayers.has('trees') || activeLayers.has('corridors');
  const showRoads = !activeLayers.size || activeLayers.has('heat') || activeLayers.has('corridors');
  const showParks = !activeLayers.size || activeLayers.has('trees');
  const showWater = true;

  const onClick = (event: any) => {
    const feature = event.features?.[0];
    if (feature && onSelectFeature) {
      onSelectFeature(feature);
    }
  };

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
      'fill-extrusion-opacity': activeLayers.has('roofs') ? 0.95 : 0.82,
    },
  };

  // Text layer for Building names
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
      'line-color': '#10b981',
      'line-width': 5,
      'line-opacity': 0.7,
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

  return (
    <div className="w-full h-full relative">
      <Map
        {...viewState}
        onMove={evt => setViewState(evt.viewState)}
        mapStyle="https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"
        interactiveLayerIds={osmData ? ['buildings'] : []}
        onClick={onClick}
      >
        {showWater && osmData?.water && (
          <Source id="osm-water" type="geojson" data={osmData.water}>
            <Layer id="water" type="fill" paint={{ 'fill-color': '#0369a1', 'fill-opacity': 0.75 }} />
          </Source>
        )}

        {showParks && osmData?.parks && (
          <Source id="osm-parks" type="geojson" data={osmData.parks}>
            <Layer id="parks" type="fill" paint={{ 'fill-color': activeLayers.has('trees') ? '#059669' : '#166534', 'fill-opacity': activeLayers.has('trees') ? 0.75 : 0.5 }} />
          </Source>
        )}

        {showRoads && osmData?.roads && (
          <Source id="osm-roads" type="geojson" data={osmData.roads}>
            {activeLayers.has('corridors') && !activeLayers.has('heat') ? <Layer {...corridorRoadLayer} /> : <Layer {...defaultRoadLayer} />}
          </Source>
        )}

        {showBuildings && adjustedBuildings && (
          <Source id="osm-buildings" type="geojson" data={adjustedBuildings}>
            <Layer {...buildingLayer} />
            {/* Added Building text labels layer */}
            <Layer {...buildingLabelLayer} />
          </Source>
        )}
      </Map>

      {/* Zone Legend Overlay */}
      {osmData && (
        <div className="absolute bottom-6 left-4 bg-slate-900/80 backdrop-blur-md rounded-xl px-3 py-2 border border-slate-700/50 text-xs text-slate-300 space-y-1.5 shadow-xl">
          <div className="font-semibold text-slate-200 mb-1 uppercase tracking-wider text-[10px]">Zone Legend</div>
          {[
            { id: 'misting_zone', color: '#3b82f6', label: 'Misting Zone' },
            { id: 'reflective_roof_zone', color: '#f97316', label: 'Reflective Roof' },
            { id: 'green_corridor_zone', color: '#10b981', label: 'Green Corridor' },
            { id: 'none', color: '#ef4444', label: 'Heat Hotspot' },
          ].map(z => (
            <div 
              key={z.id} 
              className="flex items-center gap-2 cursor-help"
              title={LEGEND_TOOLTIPS[z.id]}
            >
              <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: z.color }} />
              <span>{z.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
