'use client';

import { TreePine, Home, Wind, Zap, Activity, Droplets, Navigation, ShieldAlert, ThermometerSnowflake } from 'lucide-react';

interface InterventionData {
  type: string;
  icon?: string;
  target: string;
  impact_estimate: string;
  cost_estimate: string;
}

interface ControlPanelProps {
  interventions: InterventionData[];
  simulationState: Record<string, number>;
  onSimChange: (type: string, val: number) => void;
  cityAvgLST: number;
}

// Tailwind static class map to replace dynamic string interpolation
const COLOR_CLASSES: Record<string, { text: string; bg: string; accent: string }> = {
  emerald: { text: 'text-emerald-400', bg: 'bg-emerald-500/10', accent: 'accent-emerald-500' },
  orange: { text: 'text-orange-400', bg: 'bg-orange-500/10', accent: 'accent-orange-500' },
  blue: { text: 'text-blue-400', bg: 'bg-blue-500/10', accent: 'accent-blue-500' },
  teal: { text: 'text-teal-400', bg: 'bg-teal-500/10', accent: 'accent-teal-500' },
  amber: { text: 'text-amber-400', bg: 'bg-amber-500/10', accent: 'accent-amber-500' },
};

// Logic rules defining how different tool sliders affect temperature and energy models
const getInterventionRules = (icon?: string) => {
  switch (icon) {
    case 'tree': return { max: 100, step: 10, unit: '%',  tempRedux: 0.05, energySave: 120, label: 'Canopy Coverage', color: 'emerald', Icon: TreePine };
    case 'roof': return { max: 100, step: 10, unit: '%', tempRedux: 0.04, energySave: 80, label: 'Cool Roof Adoption', color: 'orange', Icon: Home };
    case 'mist': return { max: 1000, step: 100, unit: ' units', tempRedux: 0.002, energySave: -10, label: 'Total Misting Stations', color: 'blue', Icon: Droplets };
    case 'corridor': return { max: 50, step: 5, unit: ' km', tempRedux: 0.1, energySave: 50, label: 'Corridor Length', color: 'teal', Icon: Navigation };
    case 'pavement': return { max: 100, step: 10, unit: '%', tempRedux: 0.015, energySave: 15, label: 'Cool Pavements', color: 'blue', Icon: ThermometerSnowflake };
    default: return { max: 100, step: 10, unit: '%', tempRedux: 0.02, energySave: 30, label: 'Adoption Rate', color: 'amber', Icon: ShieldAlert };
  }
};

export default function ControlPanel({
  interventions,
  simulationState,
  onSimChange,
  cityAvgLST
}: ControlPanelProps) {
  
  // Calculate total impacts by folding over active dynamic state
  let totalTempReduction = 0;
  let energySaved = 0;

  interventions.forEach(inv => {
    const rules = getInterventionRules(inv.icon);
    const value = simulationState[inv.type] || 0;
    totalTempReduction += value * rules.tempRedux;
    energySaved += value * rules.energySave;
  });

  const currentEstimatedLST = Math.max(0, cityAvgLST - totalTempReduction);
  const co2Mitigated = (energySaved * 0.4); // rough tons of CO2

  return (
    <div className="glass-panel w-full lg:rounded-3xl p-4 sm:p-5 flex flex-col gap-4 sm:gap-5 animate-fade-in-up">
      {/* Header and Global Impact */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between border-b border-white/10 pb-4 gap-4">
        <div>
          <h3 className="text-white font-bold flex items-center gap-2 text-lg">
            <Activity size={20} className="text-emerald-400" />
            Global Control Room
          </h3>
          <p className="text-[10px] text-slate-500 mt-0.5">Simulate AI recommendations city-wide</p>
        </div>

        <div className="flex items-center gap-5 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
          <div className="flex flex-col items-end shrink-0">
            <div className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold mb-1">City Temp</div>
            <div className={`text-2xl font-bold flex items-center gap-2 tracking-tight ${totalTempReduction > 0 ? 'text-emerald-400' : 'text-slate-200'}`}>
              {currentEstimatedLST.toFixed(1)}°C
              {totalTempReduction > 0 && <span className="text-xs bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-md border border-emerald-500/30">-{totalTempReduction.toFixed(1)}°</span>}
            </div>
          </div>
          <div className="w-px h-10 bg-white/10 shrink-0" />
          <div className="flex flex-col items-end shrink-0">
            <div className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold mb-1">Energy Saved</div>
            <div className="text-2xl font-bold text-amber-400 flex items-center gap-1.5 tracking-tight">
              <Zap size={16} className="opacity-80" />
              {energySaved.toFixed(0)} <span className="text-xs text-amber-400/60 font-medium">MWh</span>
            </div>
          </div>
          <div className="w-px h-10 bg-white/10 shrink-0" />
          <div className="flex flex-col items-end shrink-0">
            <div className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold mb-1">CO₂ Avoided</div>
            <div className="text-2xl font-bold text-blue-400 flex items-center gap-1.5 tracking-tight">
              <Wind size={16} className="opacity-80" />
              {co2Mitigated.toFixed(0)} <span className="text-xs text-blue-400/60 font-medium">Tons</span>
            </div>
          </div>
        </div>
      </div>

      {/* Dynamic Sliders Grid - using horizontal scroll for both mobile and larger screens */}
      {interventions.length > 0 ? (
        <div className="flex flex-nowrap gap-3 overflow-x-auto pb-2 snap-x" style={{ scrollbarWidth: 'thin', scrollbarColor: '#334155 transparent' }}>
          {interventions.map(inv => {
            const rules = getInterventionRules(inv.icon);
            const value = simulationState[inv.type] || 0;
            const IconComponent = rules.Icon;
            const style = COLOR_CLASSES[rules.color] || COLOR_CLASSES['amber'];

            return (
              <div key={inv.type} className="bg-slate-900/40 rounded-2xl p-4 border border-white/5 shrink-0 snap-start w-[240px] hover:bg-slate-800/40 transition-colors">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded-lg ${style.bg}`}>
                       <IconComponent size={14} className={style.text} />
                    </div>
                    <span className="text-xs font-semibold text-slate-200 truncate max-w-[110px]" title={inv.type}>{inv.type}</span>
                  </div>
                  <span className={`text-xs w-12 text-right font-bold ${style.text}`}>
                    {value}{rules.unit}
                  </span>
                </div>
                
                <div className="py-2">
                  <input
                    type="range" min="0" max={rules.max} step={rules.step}
                    value={value}
                    onChange={e => onSimChange(inv.type, Number(e.target.value))}
                    className={`w-full ${style.accent}`}
                  />
                </div>
                
                <div className="text-[10px] text-slate-400 mt-2 truncate max-w-full" title={inv.target}>
                  {inv.target}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-xs text-slate-500 text-center py-2">
          Run an AI simulation to generate control dials.
        </div>
      )}
    </div>
  );
}
