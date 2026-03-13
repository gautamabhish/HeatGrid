'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  ThermometerSun, TreePine, Droplets, ArrowRight,
  Wind, Eye, MapPin, Home, Navigation, Zap,
  ChevronRight, Sun, Info, ShieldAlert, ThermometerSnowflake
} from 'lucide-react';

interface InterventionData {
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

interface SidebarProps {
  city: string;
  avgLST: number;
  avgNDVI: number;
  interventions: InterventionData[];
  overallSummary: string;
  sunExposedSide: string;
  treeRecommendationSide: string;
  shadowMsg: string;
  zoneCounts: Record<string, number>;
  selectedFeature: any | null;
  simulationState: Record<string, number>;
  onSimChange: (type: string, val: number) => void;
  loading: boolean;
}

// Logic rules defining how different tool sliders affect temperature and energy models
const getInterventionRules = (icon?: string) => {
  switch (icon) {
    case 'tree': return { max: 100, step: 10, unit: '%',  tempRedux: 0.05, Icon: TreePine };
    case 'roof': return { max: 100, step: 10, unit: '%', tempRedux: 0.04, Icon: Home };
    case 'mist': return { max: 1000, step: 100, unit: ' units', tempRedux: 0.002, Icon: Droplets };
    case 'corridor': return { max: 50, step: 5, unit: ' km', tempRedux: 0.1, Icon: Navigation };
    case 'pavement': return { max: 100, step: 10, unit: '%', tempRedux: 0.015, Icon: ThermometerSnowflake };
    default: return { max: 100, step: 10, unit: '%', tempRedux: 0.02, Icon: ShieldAlert };
  }
};

// Gauge ring component for SVF visualization
function GaugeRing({ value, max = 1, color, label, sublabel }: { value: number; max?: number; color: string; label: string; sublabel: string }) {
  const pct = Math.max(0, Math.min(1, value / max));
  const r = 22;
  const circ = 2 * Math.PI * r;
  const dash = pct * circ;

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative flex items-center justify-center w-14 h-14">
        <svg width={56} height={56} className="-rotate-90">
          <circle cx={28} cy={28} r={r} strokeWidth={5} className="stroke-slate-700 fill-none" />
          <circle
            cx={28} cy={28} r={r} strokeWidth={5}
            fill="none"
            stroke={color}
            strokeDasharray={`${dash} ${circ}`}
            strokeLinecap="round"
            style={{ transition: 'stroke-dasharray 0.5s ease' }}
          />
        </svg>
        <span className="absolute text-xs font-bold text-white" style={{ color }}>
          {(pct * 100).toFixed(0)}%
        </span>
      </div>
      <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-300">{label}</span>
      <span className="text-[9px] text-slate-500">{sublabel}</span>
    </div>
  );
}

function ZoneChip({ zone }: { zone: string }) {
  const config: Record<string, { color: string; label: string }> = {
    misting_zone: { color: 'bg-blue-900/50 text-blue-300 border-blue-600/40', label: '💧 Misting Zone' },
    reflective_roof_zone: { color: 'bg-orange-900/50 text-orange-300 border-orange-600/40', label: '🏠 Cool Roof Zone' },
    green_corridor_zone: { color: 'bg-emerald-900/50 text-emerald-300 border-emerald-600/40', label: '🌿 Green Corridor' },
    none: { color: 'bg-red-900/50 text-red-300 border-red-600/40', label: '🔥 Heat Hotspot' },
  };
  const c = config[zone] || config['none'];
  return (
    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${c.color}`}>
      {c.label}
    </span>
  );
}

function InterventionIcon({ icon }: { icon?: string }) {
  switch (icon) {
    case 'tree': return <TreePine size={16} className="text-emerald-400" />;
    case 'roof': return <Home size={16} className="text-orange-400" />;
    case 'mist': return <Droplets size={16} className="text-blue-400" />;
    case 'corridor': return <Navigation size={16} className="text-teal-400" />;
    default: return <Zap size={16} className="text-amber-400" />;
  }
}

function ROIBadge({ score }: { score: number }) {
  const color = score >= 70 ? 'bg-red-900/40 text-red-400 border-red-500/40'
    : score >= 40 ? 'bg-amber-900/40 text-amber-400 border-amber-500/40'
    : 'bg-slate-800 text-slate-400 border-slate-600/40';
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${color} uppercase tracking-wide`}>
      ROI {score}
    </span>
  );
}

export default function InterventionSidebar({
  city, avgLST, avgNDVI, interventions, overallSummary,
  sunExposedSide, treeRecommendationSide, shadowMsg,
  zoneCounts, selectedFeature, simulationState, onSimChange, loading
}: SidebarProps) {
  const [activeTab, setActiveTab] = useState<'report' | 'interventions'>('interventions');
  const [expandedInsight, setExpandedInsight] = useState<number | null>(null);

  useEffect(() => {
    if (selectedFeature) setActiveTab('report');
  }, [selectedFeature]);

  const sfProps = selectedFeature?.properties || {};
  const svf = parseFloat(sfProps.svf || '1');
  const pedScore = parseInt(sfProps.pedestrian_proxy || '1');
  const simLST = parseFloat(sfProps.simulated_lst || avgLST);

  // Dynamically calculate the total temperature reduction locally based on active simulation state
  const totalLocalReduction = useMemo(() => {
    let reduction = 0;
    interventions.forEach(inv => {
      const rules = getInterventionRules(inv.icon);
      const val = simulationState[inv.type] || 0;
      reduction += val * rules.tempRedux;
    });
    return reduction;
  }, [simulationState, interventions]);

  const adjustedLST = simLST - totalLocalReduction;

  return (
    <div className="flex flex-col w-full h-full overflow-hidden shadow-2xl text-white border-l border-white/5 glass-panel">

      {/* Header */}
      <div className="px-5 pt-6 pb-4 border-b border-white/5 shrink-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="text-xl font-bold leading-tight text-white">
              {city || 'Any City Heat Mapper'}
            </h2>
            <p className="text-slate-500 text-xs mt-0.5">Urban Cooling Intelligence</p>
          </div>
          {city && (
            <div className="flex flex-col items-end gap-1 shrink-0">
              <div className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                avgLST > 35 ? 'bg-red-900/50 text-red-400' :
                avgLST > 30 ? 'bg-orange-900/50 text-orange-400' :
                'bg-amber-900/50 text-amber-400'
              }`}>
                {avgLST.toFixed(1)}°C
              </div>
              <div className="text-[10px] text-slate-500">Avg Surface Temp</div>
            </div>
          )}
        </div>

        {/* Metric pills */}
        {city && (
          <div className="flex gap-2 mt-4 cursor-default">
            <div className="flex-1 glass-pill rounded-xl px-3 py-2 border-white/5 shadow-inner" title="Overall Land Surface Temperature retrieved via MODIS/Landsat data.">
              <div className="flex items-center gap-1.5 text-red-400 mb-1 opacity-80">
                <ThermometerSun size={12} />
                <span className="text-[10px] font-semibold uppercase tracking-wider">LST</span>
              </div>
              <div className="text-xl font-bold tracking-tight">{avgLST.toFixed(1)}°C</div>
            </div>
            <div className="flex-1 glass-pill rounded-xl px-3 py-2 border-white/5 shadow-inner" title="Normalized Difference Vegetation Index. 1.0 means dense forest, 0 means barren heat trap.">
              <div className="flex items-center gap-1.5 text-emerald-400 mb-1 opacity-80">
                <TreePine size={12} />
                <span className="text-[10px] font-semibold uppercase tracking-wider">NDVI</span>
              </div>
              <div className="text-xl font-bold tracking-tight">{avgNDVI.toFixed(2)}</div>
            </div>
            {zoneCounts && (
              <div className="flex-1 glass-pill rounded-xl px-3 py-2 border-white/5 shadow-inner">
                <div className="flex items-center gap-1.5 text-orange-400 mb-1 opacity-80">
                  <Zap size={12} />
                  <span className="text-[10px] font-semibold uppercase tracking-wider">Zones</span>
                </div>
                <div className="text-xl font-bold tracking-tight">
                  {Object.values(zoneCounts).reduce((a: number, b) => a + (b as number), 0) - (zoneCounts['none'] || 0)}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Tab bar */}
      {city && (
        <div className="flex border-b border-slate-800 shrink-0">
          <button
            onClick={() => setActiveTab('interventions')}
            className={`flex-1 py-2.5 text-xs font-semibold uppercase tracking-wider transition-colors ${
              activeTab === 'interventions'
                ? 'text-emerald-400 border-b-2 border-emerald-500 bg-emerald-950/20'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            AI Interventions
          </button>
          <button
            onClick={() => setActiveTab('report')}
            className={`flex-1 py-2.5 text-xs font-semibold uppercase tracking-wider transition-colors ${
              activeTab === 'report'
                ? 'text-blue-400 border-b-2 border-blue-500 bg-blue-950/20'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            {selectedFeature ? 'Street Report' : 'City Report'}
          </button>
        </div>
      )}

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: '#334155 transparent' }}>

        {/* Empty state */}
        {!city && !loading && (
          <div className="flex flex-col items-center justify-center h-full gap-4 px-6 text-center">
            <div className="w-16 h-16 rounded-2xl bg-emerald-900/30 border border-emerald-700/30 flex items-center justify-center">
              <MapPin size={28} className="text-emerald-500" />
            </div>
            <div>
              <p className="text-slate-300 font-medium mb-1">Search any city or locality</p>
              <p className="text-slate-500 text-sm">Type a city, street, or neighborhood to analyze urban heat patterns and get AI cooling recommendations.</p>
            </div>
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <div className="w-10 h-10 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-slate-400 text-sm">Analyzing urban heat data...</p>
          </div>
        )}

        {/* INTERVENTIONS TAB */}
        {city && !loading && activeTab === 'interventions' && (
          <div className="p-4 space-y-4">
            {/* Overall Summary */}
            {overallSummary && (
              <div className="bg-slate-900/40 rounded-2xl p-4 border border-white/5 animate-fade-in-up shadow-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Info size={14} className="text-slate-400" />
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">City Analysis</span>
                </div>
                <p className="text-sm text-slate-300 leading-relaxed font-light">{overallSummary}</p>
              </div>
            )}

            {/* Sun / Shadow Info */}
            {shadowMsg && (
              <div className="bg-yellow-900/10 rounded-2xl p-4 border border-yellow-500/20 flex gap-3 items-start animate-fade-in-up shadow-lg shadow-yellow-900/10">
                <Sun size={18} className="text-yellow-400 shrink-0 mt-0.5 animate-[spin_10s_linear_infinite]" />
                <div>
                  <div className="text-[10px] font-semibold text-yellow-400/90 uppercase tracking-wider mb-1">Shadow Modeling (July 2PM)</div>
                  <p className="text-xs text-slate-300 leading-relaxed">{shadowMsg}</p>
                  {treeRecommendationSide && (
                     <p className="text-xs font-medium text-emerald-400 mt-2 bg-emerald-500/10 px-2 py-1 rounded inline-block" title="Determined by parsing vector geometry against standard astronomical algorithms for this latitude.">
                        🌳 Plant trees on: <strong>{treeRecommendationSide}</strong>
                     </p>
                  )}
                </div>
              </div>
            )}

            {/* Zone summary */}
            {zoneCounts && Object.keys(zoneCounts).length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {[
                  { key: 'misting_zone', label: 'Misting', color: 'text-blue-400', bg: 'bg-blue-950/40 border-blue-800/30' },
                  { key: 'reflective_roof_zone', label: 'Cool Roof', color: 'text-orange-400', bg: 'bg-orange-950/40 border-orange-800/30' },
                  { key: 'green_corridor_zone', label: 'Corridor', color: 'text-emerald-400', bg: 'bg-emerald-950/40 border-emerald-800/30' },
                ].map(z => (
                  <div key={z.key} className={`rounded-lg p-2.5 border text-center ${z.bg}`}>
                    <div className={`text-xl font-bold ${z.color}`}>{zoneCounts[z.key] || 0}</div>
                    <div className={`text-[10px] ${z.color} opacity-80`}>{z.label}</div>
                  </div>
                ))}
              </div>
            )}

            {/* AI Interventions */}
            {interventions.length > 0 ? (
              <div className="space-y-4 pt-2">
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
                  <div className="h-px bg-slate-800 flex-1" />
                  AI Recommendations
                  <div className="h-px bg-slate-800 flex-1" />
                </h3>
                {interventions.map((inv, idx) => (
                  <div
                    key={idx}
                    className="bg-slate-900/40 rounded-2xl border border-white/5 hover:bg-slate-800/60 hover:border-slate-600 transition-all duration-300 overflow-hidden group hover:-translate-y-1 hover:shadow-xl cursor-default animate-fade-in-up"
                    style={{ animationDelay: `${idx * 100}ms` }}
                  >
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-slate-800/80 flex items-center justify-center shrink-0 shadow-inner border border-white/5 group-hover:scale-110 transition-transform">
                            <InterventionIcon icon={inv.icon} />
                          </div>
                          <span className="font-bold text-sm text-white">{inv.type}</span>
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          {inv.roi_score !== undefined && <ROIBadge score={inv.roi_score} />}
                          <span className="text-[10px] font-mono bg-slate-800 px-2 py-0.5 rounded text-slate-400">
                            {inv.cost_estimate}
                          </span>
                        </div>
                      </div>

                      {inv.priority_label && (
                        <div className="text-[10px] text-amber-400 font-semibold uppercase tracking-wider mb-2">
                          ⭐ {inv.priority_label}
                        </div>
                      )}

                      <p className="text-xs text-slate-400 mb-2">
                        <span className="text-slate-500">Target: </span>{inv.target}
                      </p>

                      {inv.narrative && (
                        <p className="text-[11px] text-slate-300 italic leading-relaxed mb-3 pt-1">
                          "{inv.narrative}"
                        </p>
                      )}

                      {inv.engineering_insight && (
                         <div className="mb-3">
                           <button
                             onClick={(e) => {
                               e.stopPropagation();
                               setExpandedInsight(expandedInsight === idx ? null : idx);
                             }}
                             className="flex items-center gap-1.5 text-[10px] font-semibold text-emerald-400 hover:text-emerald-300 transition-colors uppercase tracking-wider"
                           >
                              <Info size={12} />
                              {expandedInsight === idx ? 'Hide Engineer Insight' : 'Why this works'}
                           </button>
                           
                           {expandedInsight === idx && (
                             <div className="mt-2 text-xs text-slate-400 bg-slate-950/50 p-2.5 rounded border border-slate-800/80 leading-relaxed">
                               {inv.engineering_insight}
                             </div>
                           )}
                         </div>
                      )}

                      <div className="flex items-center justify-between pt-2 border-t border-slate-800/60">
                        <span className="text-xs font-medium text-blue-300 bg-blue-900/30 px-2.5 py-1 rounded-lg border border-blue-800/30">
                          {inv.impact_estimate}
                        </span>
                        <ChevronRight size={14} className="text-slate-600 group-hover:text-slate-400 transition-colors" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : city && (
              <div className="text-center text-slate-500 text-sm py-6">
                No specific interventions generated yet.
              </div>
            )}
          </div>
        )}

        {/* STREET REPORT TAB */}
        {city && !loading && activeTab === 'report' && (
          <div className="p-4 space-y-4">
            {!selectedFeature ? (
              <div className="bg-slate-900 rounded-xl p-4 border border-slate-800">
                <div className="flex items-center gap-2 mb-2">
                  <Sun size={14} className="text-yellow-400" />
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Shadow Analysis (July 2PM)</span>
                </div>
                <p className="text-sm text-slate-300 mb-3">{shadowMsg || 'No shadow data available.'}</p>
                {treeRecommendationSide && (
                  <div className="bg-emerald-950/40 border border-emerald-800/30 rounded-lg p-3">
                    <p className="text-xs text-emerald-300">
                      🌳 <strong>Tree Planting Recommendation:</strong><br />
                      {treeRecommendationSide}
                    </p>
                  </div>
                )}
                <p className="text-slate-500 text-xs mt-4 text-center">Click a building on the map to see its Street Report Card.</p>
              </div>
            ) : (
              <>
                {/* Feature Header */}
                <div className="bg-slate-900/40 rounded-2xl p-5 border border-white/5 shadow-lg animate-fade-in-up">
                  <div className="flex items-start justify-between gap-2 mb-4">
                    <div className="overflow-hidden">
                      <h3 className="font-bold text-lg text-white truncate" title={sfProps.name || sfProps.highway || 'Urban Structure'}>
                        {sfProps.name || sfProps.highway || 'Urban Structure'}
                      </h3>
                      <p className="text-slate-400 text-xs mt-0.5">Street Report Card</p>
                    </div>
                    <ZoneChip zone={sfProps.intervention_zone || 'none'} />
                  </div>

                  {/* SVF + Ped Score gauges */}
                  <div className="flex justify-around py-3 border-y border-slate-800/60">
                    <div title="Sky View Factor: Evaluates how open the sky is versus the building facades. Lower is canyon-like.">
                        <GaugeRing
                        value={svf}
                        max={1}
                        color="#10b981"
                        label="Sky View"
                        sublabel={svf < 0.4 ? 'Deep Canyon' : svf < 0.6 ? 'Moderate' : 'Open Sky'}
                        />
                    </div>
                    <div title="Estimate of relative foot traffic exposure to extreme heat based on building types.">
                        <GaugeRing
                        value={pedScore}
                        max={10}
                        color="#3b82f6"
                        label="Foot Traffic"
                        sublabel={pedScore >= 8 ? 'Very High' : pedScore >= 5 ? 'Moderate' : 'Low'}
                        />
                    </div>
                    <div title="Estimated surface coolness relative to surroundings. Lower is hotter.">
                        <GaugeRing
                        value={Math.max(0, 45 - adjustedLST) / 45}
                        max={1}
                        color={adjustedLST > 35 ? '#ef4444' : adjustedLST > 30 ? '#f97316' : '#fcd34d'}
                        label="Coolness"
                        sublabel={`${adjustedLST.toFixed(1)}°C`}
                        />
                    </div>
                  </div>

                  {/* Detail rows */}
                  <div className="space-y-2 mt-3">
                    {[
                      { label: 'Roof Type', value: sfProps.roof_type || 'Unknown', icon: <Home size={12} /> },
                      {
                        label: 'Shadow Direction',
                        value: sfProps.shadow_direction_deg ? `${sfProps.shadow_direction_deg}° (${sfProps.shadow_length_m}m long)` : 'N/A',
                        icon: <Sun size={12} />
                      },
                      { label: 'SVF', value: svf.toFixed(2), icon: <Eye size={12} /> },
                    ].map(row => (
                      <div key={row.label} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5 text-slate-500">
                          {row.icon}
                          <span>{row.label}</span>
                        </div>
                        <span className="text-slate-300 font-medium capitalize">{row.value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Impact Simulator */}
                <div className="glass-pill rounded-2xl p-5 border border-emerald-500/20 shadow-lg animate-fade-in-up mt-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Zap size={16} className="text-emerald-400" />
                      <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Impact Simulator</span>
                    </div>
                    {totalLocalReduction > 0 && (
                        <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.2)]">
                        -{totalLocalReduction.toFixed(1)}°C
                        </span>
                    )}
                  </div>

                  {/* Before / After */}
                  <div className="flex items-center justify-between mb-4 mt-2">
                    <div className="text-center">
                      <div className="text-xs text-slate-500 mb-1">Raw Modeled Heat</div>
                      <div className="text-2xl font-bold text-red-400">{simLST.toFixed(1)}°C</div>
                    </div>
                    <div className="flex-1 flex flex-col items-center px-3" title={`Applying all chosen simulation controls`}>
                      <ArrowRight size={20} className="text-emerald-500" />
                      <span className="text-emerald-400 text-xs font-bold mt-1">
                        {totalLocalReduction > 0 ? `-${totalLocalReduction.toFixed(1)}°C` : '—'}
                      </span>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-slate-500 mb-1">Simulated Heat</div>
                      <div className={`text-2xl font-bold ${adjustedLST < simLST ? 'text-emerald-400' : 'text-orange-400'}`}>
                        {adjustedLST.toFixed(1)}°C
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 mt-4 border-t border-slate-800/60 pt-4">
                     <p className="text-[10px] text-slate-500 text-center uppercase tracking-wider mb-2">Adjust Local Interventions</p>
                     
                     {interventions.length > 0 ? interventions.map(inv => {
                        const rules = getInterventionRules(inv.icon);
                        const value = simulationState[inv.type] || 0;
                        const IconComponent = rules.Icon;
                        return (
                           <div key={inv.type} className="mb-2">
                              <div className="flex justify-between text-xs mb-1">
                                 <span className="text-slate-300 flex items-center gap-1.5"><IconComponent size={12} className="text-slate-400"/> {inv.type}</span>
                                 <span className="text-slate-400">{value}{rules.unit}</span>
                              </div>
                              <input
                                 type="range" min="0" max={rules.max} step={rules.step}
                                 value={value}
                                 onChange={e => onSimChange(inv.type, Number(e.target.value))}
                                 className="w-full h-1 bg-slate-700 rounded-full appearance-none cursor-pointer accent-emerald-500"
                              />
                           </div>
                        )
                     }) : (
                        <p className="text-xs text-slate-500 text-center">No simulated variables applied.</p>
                     )}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
