import React, { useMemo, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
} from 'react-native';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { Colors, Radius, Spacing } from '@/constants/theme';
import GestureSlider from '@/components/GestureSlider';
import type { InterventionData } from '@/hooks/useCityAnalysis';

interface StreetReportSheetProps {
  feature: any;
  avgLST: number;
  interventions: InterventionData[];
  simulationState: Record<string, number>;
  onSimChange: (type: string, val: number) => void;
  onClose: () => void;
}

const getInterventionRules = (icon?: string) => {
  switch (icon) {
    case 'tree':
      return { max: 100, step: 1, unit: '%', tempRedux: 0.05, color: Colors.lime };

    case 'roof':
      return { max: 100, step: 1, unit: '%', tempRedux: 0.04, color: Colors.pink };

    case 'mist':
      return { max: 1000, step: 10, unit: ' units', tempRedux: 0.002, color: Colors.cyan };

    case 'corridor':
      return { max: 50, step: 0.5, unit: ' km', tempRedux: 0.1, color: Colors.violet };

    case 'pavement':
      return { max: 100, step: 1, unit: '%', tempRedux: 0.015, color: Colors.blue };

    default:
      return { max: 100, step: 1, unit: '%', tempRedux: 0.02, color: Colors.amber };
  }
};
const ZONE_LABELS: Record<string, { emoji: string; label: string; color: string }> = {
  misting_zone:         { emoji: '', label: 'Misting Zone',   color: Colors.cyan },
  reflective_roof_zone: { emoji: '', label: 'Cool Roof Zone', color: Colors.pink },
  green_corridor_zone:  { emoji: '', label: 'Green Corridor', color: Colors.violet },
  none:                 { emoji: '', label: 'Heat Hotspot',   color: Colors.red },
};

function GaugeBar({ value, max = 1, color, label, sublabel }: { value: number; max?: number; color: string; label: string; sublabel: string }) {
  const pct = Math.min(1, Math.max(0, value / max));
  return (
    <View style={gauge.container}>
      <Text style={[gauge.value, { color }]}>{(pct * 100).toFixed(0)}%</Text>
      <View style={gauge.track}>
        <View style={[gauge.fill, { width: `${pct * 100}%` as any, backgroundColor: color }]} />
      </View>
      <Text style={gauge.label}>{label}</Text>
      <Text style={gauge.sub}>{sublabel}</Text>
    </View>
  );
}

const gauge = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', gap: 4 },
  value: { fontSize: 16, fontWeight: '700' },
  track: {
    width: '80%',
    height: 4,
    backgroundColor: Colors.bgCardAlt,
    borderRadius: 2,
    overflow: 'hidden',
  },
  fill: { height: '100%', borderRadius: 2 },
  label: { color: Colors.textMuted, fontSize: 10, fontWeight: '600', textTransform: 'uppercase' },
  sub: { color: Colors.textFaint, fontSize: 9 },
});

export default function StreetReportSheet({
  feature, avgLST, interventions, simulationState, onSimChange, onClose
}: StreetReportSheetProps) {
  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['50%', '85%'], []);

  const sfProps = feature?.properties || {};
  const svf = parseFloat(sfProps.svf || '1');
  const pedScore = parseInt(sfProps.pedestrian_proxy || '1');
  const simLST = parseFloat(sfProps.simulated_lst || String(avgLST));
  const zone = sfProps.intervention_zone || 'none';
  const zoneCfg = ZONE_LABELS[zone] ?? ZONE_LABELS['none'];

  const totalReduction = useMemo(() => {
    let r = 0;
    interventions.forEach(inv => {
      const rules = getInterventionRules(inv.icon);
      r += (simulationState[inv.type] || 0) * rules.tempRedux;
    });
    return r;
  }, [simulationState, interventions]);

  const adjustedLST = simLST - totalReduction;
  const lstColor = adjustedLST > 35 ? Colors.red : adjustedLST > 30 ? Colors.orange : Colors.amber;

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={0}
      snapPoints={snapPoints}
      onClose={onClose}
      enablePanDownToClose
      backgroundStyle={styles.sheetBg}
      handleIndicatorStyle={styles.handle}
    >
      <BottomSheetScrollView contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.featureTitle} numberOfLines={1}>
              {sfProps.name || sfProps.highway || 'Urban Structure'}
            </Text>
            <Text style={styles.featureSub}>Street Report Card</Text>
          </View>
          <View style={[styles.zoneBadge, { borderColor: zoneCfg.color + '60' }]}>
            <Text style={[styles.zoneBadgeText, { color: zoneCfg.color }]}>
              {zoneCfg.emoji} {zoneCfg.label}
            </Text>
          </View>
        </View>

        {/* Gauges */}
        <View style={styles.gaugeRow}>
          <GaugeBar
            value={svf} max={1} color={Colors.accent} label="Sky View"
            sublabel={svf < 0.4 ? 'Deep Canyon' : svf < 0.6 ? 'Moderate' : 'Open Sky'}
          />
          <GaugeBar
            value={pedScore} max={10} color={Colors.blue} label="Foot Traffic"
            sublabel={pedScore >= 8 ? 'Very High' : pedScore >= 5 ? 'Moderate' : 'Low'}
          />
          <GaugeBar
            value={Math.max(0, 45 - adjustedLST) / 45} max={1} color={lstColor} label="Coolness"
            sublabel={`${adjustedLST.toFixed(1)}°C`}
          />
        </View>

        {/* Detail rows */}
        <View style={styles.detailBlock}>
          {[
            { label: 'Roof Type', value: sfProps.roof_type || 'Unknown' },
            { label: 'SVF', value: svf.toFixed(2) },
            { label: 'Shadow Dir', value: sfProps.shadow_direction_deg ? `${sfProps.shadow_direction_deg}° (${sfProps.shadow_length_m}m)` : 'N/A' },
          ].map(row => (
            <View key={row.label} style={styles.detailRow}>
              <Text style={styles.detailLabel}>{row.label}</Text>
              <Text style={styles.detailValue}>{row.value}</Text>
            </View>
          ))}
        </View>

        {/* Impact Simulator */}
        <View style={styles.simCard}>
          <View style={styles.simHeader}>
            <Text style={styles.simTitle}>⚡ Impact Simulator</Text>
            {totalReduction > 0 && (
              <Text style={styles.simBadge}>-{totalReduction.toFixed(1)}°C</Text>
            )}
          </View>

          {/* Before / After */}
          <View style={styles.beforeAfter}>
            <View style={styles.baBlock}>
              <Text style={styles.baLabel}>Raw Heat</Text>
              <Text style={[styles.baTemp, { color: Colors.red }]}>{simLST.toFixed(1)}°C</Text>
            </View>
            <Text style={styles.baArrow}>→</Text>
            <View style={styles.baBlock}>
              <Text style={styles.baLabel}>Simulated</Text>
              <Text style={[styles.baTemp, { color: adjustedLST < simLST ? Colors.accent : Colors.orange }]}>
                {adjustedLST.toFixed(1)}°C
              </Text>
            </View>
          </View>

          {/* Sliders */}
          {interventions.map(inv => {
            const rules = getInterventionRules(inv.icon);
            return (
              <GestureSlider
                key={inv.type}
                label={inv.type}
                value={simulationState[inv.type] || 0}
                max={rules.max}
                step={rules.step}
                unit={rules.unit}
                accentColor={rules.color}
                onChange={(val) => onSimChange(inv.type, val)}
              />
            );
          })}
        </View>

        {/* Close button */}
        <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7}>
          <Text style={styles.closeBtnText}>Close</Text>
        </TouchableOpacity>
      </BottomSheetScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  sheetBg: {
    backgroundColor: '#020617', // Deeper slate-950
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
  },
  handle: { 
    backgroundColor: 'rgba(255, 255, 255, 0.15)', 
    width: 48,
    height: 4,
  },
  content: { padding: Spacing.md, paddingBottom: 40 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
    gap: 10,
  },
  featureTitle: { color: Colors.text, fontSize: 18, fontWeight: '700', flex: 1 },
  featureSub: { color: Colors.textMuted, fontSize: 11, marginTop: 2 },
  zoneBadge: {
    borderRadius: Radius.full,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  zoneBadgeText: { fontSize: 10, fontWeight: '600' },
  gaugeRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  detailBlock: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
    padding: Spacing.md,
    gap: 10,
    marginBottom: Spacing.md,
  },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between' },
  detailLabel: { color: Colors.textFaint, fontSize: 12 },
  detailValue: { color: Colors.text, fontSize: 12, fontWeight: '600' },
  simCard: {
    backgroundColor: 'rgba(16,185,129,0.03)',
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.15)',
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    gap: Spacing.md,
  },
  simHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  simTitle: { color: Colors.accent, fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  simBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.accent,
    backgroundColor: 'rgba(16,185,129,0.15)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.3)',
  },
  beforeAfter: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  baBlock: { alignItems: 'center' },
  baLabel: { color: Colors.textFaint, fontSize: 10, marginBottom: 2 },
  baTemp: { fontSize: 24, fontWeight: '700' },
  baArrow: { color: Colors.accent, fontSize: 20, fontWeight: '700' },
  closeBtn: {
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: Radius.md,
    backgroundColor: Colors.bgCard,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  closeBtnText: { color: Colors.textMuted, fontSize: 14, fontWeight: '600' },
});
