'use client';

import { Flame, TreePine, Home, Droplets, Navigation } from 'lucide-react';

export type ActiveLayer = 'heat' | 'trees' | 'roofs' | 'corridors';

interface LayerToggleProps {
  activeLayers: Set<ActiveLayer>;
  onToggle: (layer: ActiveLayer) => void;
}

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

export default function LayerToggle({ activeLayers, onToggle }: LayerToggleProps) {
  return (
    <div className="flex gap-2 flex-wrap glass-pill p-1.5 rounded-full">
      {LAYERS.map(layer => {
        const isActive = activeLayers.has(layer.key);
        return (
          <button
            key={layer.key}
            onClick={() => onToggle(layer.key)}
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
