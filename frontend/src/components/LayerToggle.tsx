'use client';

import { Flame, TreePine, Home, Droplets, Navigation } from 'lucide-react';

export type ActiveLayer = 'heat' | 'trees' | 'roofs' | 'corridors';

interface LayerToggleProps {
  activeLayers: Set<ActiveLayer>;
  onToggle: (layer: ActiveLayer) => void;
  osmData: any;
}
// Tooltip definitions to remove ambiguity
const LEGEND_TOOLTIPS: Record<string, string> = {
  misting_zone: 'Areas chosen by AI for atomized water misting (High Heat + High Foot Traffic).',
  reflective_roof_zone: 'Areas recommended for high-albedo roof coatings to reflect solar radiation (Dark roofs or deep canyons).',
  green_corridor_zone: 'Streets selected for dense tree planting to provide shade and evapotranspiration (Low NDVI + Hot).',
  none: 'Default heat zones experiencing above-average temperatures without specific infrastructure tags yet.'
};

const LAYERS: { key: ActiveLayer; label: string; icon: React.ReactNode; color: string; activeColor: string }[] = [
  {
    key: 'heat',
    label: 'Heatmap',
    icon: <Flame size={14} />,
    color: 'text-slate-400 border-white/10 hover:bg-white/5',
    activeColor: 'text-red-400 border-red-500/40 bg-red-950/40 shadow-[inset_0_0_12px_rgba(248,113,113,0.15)]',
  },
  {
    key: 'trees',
    label: 'Plant Trees',
    icon: <TreePine size={14} />,
    color: 'text-slate-400 border-white/10 hover:bg-white/5',
    activeColor: 'text-emerald-400 border-emerald-500/40 bg-emerald-950/40 shadow-[inset_0_0_12px_rgba(16,185,129,0.15)]',
  },
  {
    key: 'roofs',
    label: 'Cool Roofs',
    icon: <Home size={14} />,
    color: 'text-slate-400 border-white/10 hover:bg-white/5',
    activeColor: 'text-orange-400 border-orange-500/40 bg-orange-950/40 shadow-[inset_0_0_12px_rgba(249,115,22,0.15)]',
  },
  {
    key: 'corridors',
    label: 'Green Corridors',
    icon: <Navigation size={14} />,
    color: 'text-slate-400 border-white/10 hover:bg-white/5',
    activeColor: 'text-teal-400 border-teal-500/40 bg-teal-950/40 shadow-[inset_0_0_12px_rgba(20,184,166,0.15)]',
  },
];

export default function LayerToggle({ activeLayers, osmData, onToggle }: LayerToggleProps) {
  return (
    <div className="flex gap-2 flex-wrap glass-pill p-1.5 rounded-full relative">
      {LAYERS.map(layer => {
        const isActive = activeLayers.has(layer.key);
        return (
          <button
            key={layer.key}
            onClick={() => onToggle(layer.key)}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-transparent text-xs font-medium transition-all duration-300 ${isActive ? layer.activeColor + ' scale-105 z-10' : layer.color
              }`}
          >
            {layer.icon}
            {layer.label}
          </button>
        );
      })}
      {/* Zone Legend Overlay */}
      {osmData && (
        <div className="absolute top-[120%] right-0 w-max bg-slate-900/80 backdrop-blur-md rounded-xl px-3 py-2 border border-slate-700/50 text-xs text-slate-300 space-y-1.5 shadow-xl">
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
