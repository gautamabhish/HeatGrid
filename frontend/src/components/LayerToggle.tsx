'use client';

import { Flame, TreePine, Home, Droplets, Navigation } from 'lucide-react';

export type ActiveLayer = 'heat' | 'trees' | 'roofs' | 'corridors';

interface LayerToggleProps {
  activeLayers: Set<ActiveLayer>;
  onToggle: (layer: ActiveLayer) => void;
  osmData: any;
}

const LAYERS: {
  key: ActiveLayer;
  label: string;
  icon: React.ReactNode;
  color: string;
  activeColor: string;
}[] = [
  {
    key: 'heat',
    label: 'Heatmap',
    icon: <Flame size={14} />,
    color: 'text-slate-400 border-white/10 hover:bg-white/5',
    // Red — matches temperature fill
    activeColor: 'text-red-400 border-red-500/40 bg-red-950/40 shadow-[inset_0_0_12px_rgba(248,113,113,0.15)]',
  },
  {
    key: 'trees',
    label: 'Plant Trees',
    icon: <TreePine size={14} />,
    color: 'text-slate-400 border-white/10 hover:bg-white/5',
    // Purple — matches green_corridor_zone outline (#a78bfa)
    activeColor: 'text-violet-400 border-violet-500/40 bg-violet-950/40 shadow-[inset_0_0_12px_rgba(167,139,250,0.15)]',
  },
  {
    key: 'roofs',
    label: 'Cool Roofs',
    icon: <Home size={14} />,
    color: 'text-slate-400 border-white/10 hover:bg-white/5',
    // Pink — matches reflective_roof_zone outline (#f472b6)
    activeColor: 'text-pink-400 border-pink-500/40 bg-pink-950/40 shadow-[inset_0_0_12px_rgba(244,114,182,0.15)]',
  },
  {
    key: 'corridors',
    label: 'Green Corridors',
    icon: <Navigation size={14} />,
    color: 'text-slate-400 border-white/10 hover:bg-white/5',
    // Cyan — matches misting zone / corridor roads color family
    activeColor: 'text-cyan-400 border-cyan-500/40 bg-cyan-950/40 shadow-[inset_0_0_12px_rgba(34,211,238,0.15)]',
  },
];

export default function LayerToggle({ activeLayers, osmData: _osmData, onToggle }: LayerToggleProps) {
  return (
    <div className="flex gap-2 flex-wrap glass-pill p-1.5 rounded-full">
      {LAYERS.map(layer => {
        const isActive = activeLayers.has(layer.key);
        return (
          <button
            key={layer.key}
            onClick={() => onToggle(layer.key)}
            title={
              layer.key === 'heat' ? 'Show/hide temperature gradient'
                : layer.key === 'trees' ? 'Highlight green corridor zones (purple outlines)'
                : layer.key === 'roofs' ? 'Highlight reflective roof zones (pink outlines)'
                : 'Highlight corridor roads (purple overlay)'
            }
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-transparent text-xs font-medium transition-all duration-300 ${
              isActive ? layer.activeColor + ' scale-105 z-10' : layer.color
            }`}
          >
            {layer.icon}
            {layer.label}
          </button>
        );
      })}
    </div>
  );
}
