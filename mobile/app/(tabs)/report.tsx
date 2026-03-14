import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useCityContext } from '@/context/CityContext';
import InterventionCard from '@/components/InterventionCard';
import GestureSlider from '@/components/GestureSlider';
import { Colors, Spacing, Radius } from '@/constants/theme';

type Tab = 'interventions' | 'report';

const getInterventionRules = (icon?: string) => {
  switch (icon) {
    case 'tree':     return { max: 100, step: 10, unit: '%', tempRedux: 0.05, energySave: 120, color: Colors.lime };
    case 'roof':     return { max: 100, step: 10, unit: '%', tempRedux: 0.04, energySave: 80,  color: Colors.pink };
    case 'mist':     return { max: 1000, step: 100, unit: ' units', tempRedux: 0.002, energySave: -10, color: Colors.cyan };
    case 'corridor': return { max: 50, step: 5, unit: ' km', tempRedux: 0.1, energySave: 50, color: Colors.violet };
    case 'pavement': return { max: 100, step: 10, unit: '%', tempRedux: 0.015, energySave: 15, color: Colors.blue };
    default:         return { max: 100, step: 10, unit: '%', tempRedux: 0.02, energySave: 30, color: Colors.amber };
  }
};

export default function ReportScreen() {
  const {
    loading, cityData, cityName, simulationState, handleSimChange,
  } = useCityContext();

  const [activeTab, setActiveTab] = useState<Tab>('interventions');
  const [expandedInsight, setExpandedInsight] = useState<number | null>(null);

  const avgLST = cityData?.gee_metrics.avg_lst_celsius ?? 0;
  const avgNDVI = cityData?.gee_metrics.avg_ndvi ?? 0;
  const interventions = cityData?.ai_interventions ?? [];

  const { totalTempReduction, totalEnergy, co2 } = useMemo(() => {
    let temp = 0, energy = 0;
    interventions.forEach(inv => {
      const r = getInterventionRules(inv.icon);
      const val = simulationState[inv.type] ?? 0;
      temp += val * r.tempRedux;
      energy += val * r.energySave;
    });
    return { totalTempReduction: temp, totalEnergy: energy, co2: energy * 0.4 };
  }, [interventions, simulationState]);

  const zoneCounts: Record<string, number> = cityData?.zone_counts ?? {};
  const totalZones = (Object.values(zoneCounts) as number[]).reduce((a: number, b: number) => a + b, 0) - (zoneCounts['none'] ?? 0);

  const lstColor = avgLST > 35 ? Colors.red : avgLST > 30 ? Colors.orange : Colors.amber;

  if (!cityData && !loading) {
    return (
      <SafeAreaView edges={['top']} style={[styles.container, styles.emptyState]}>
        <Text style={styles.emptyIcon}>🗺️</Text>
        <Text style={styles.emptyTitle}>No city analyzed yet</Text>
        <Text style={styles.emptyMsg}>Search for a city on the Map tab to see AI cooling recommendations and urban heat analysis here.</Text>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView edges={['top']} style={[styles.container, styles.emptyState]}>
        <View style={styles.loadingRing} />
        <Text style={styles.emptyMsg}>Analyzing urban heat data...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      {/* Header */}
      <LinearGradient colors={['#0f172a', '#020617']} style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.cityName}>{cityName.split(',')[0]}</Text>
            <Text style={styles.headerSub}>Urban Cooling Intelligence</Text>
          </View>
          <View style={[styles.lstBadge, { borderColor: lstColor + '60', backgroundColor: lstColor + '20' }]}>
            <Text style={[styles.lstText, { color: lstColor }]}>{avgLST.toFixed(1)}°C</Text>
            <Text style={styles.lstSub}>Avg Surface Temp</Text>
          </View>
        </View>

        {/* Metric pills */}
        <View style={styles.pillRow}>
          {[
            { emoji: '', label: 'LST', value: `${avgLST.toFixed(1)}°C`, color: Colors.red },
            { emoji: '', label: 'NDVI', value: avgNDVI.toFixed(2), color: Colors.accent },
            { emoji: '', label: 'Zones', value: String(totalZones), color: Colors.orange },
          ].map(pill => (
            <View key={pill.label} style={styles.pill}>
              <View style={styles.pillHeader}>
                <Text style={styles.pillEmoji}>{pill.emoji}</Text>
                <Text style={styles.pillLabel}>{pill.label}</Text>
              </View>
              <Text style={[styles.pillValue, { color: pill.color }]}>{pill.value}</Text>
            </View>
          ))}
        </View>

        {/* Tab bar */}
        <View style={styles.tabBar}>
          {(['interventions', 'report'] as Tab[]).map(tab => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
              onPress={() => setActiveTab(tab)}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.tabText,
                activeTab === tab && (tab === 'interventions' ? styles.tabTextGreen : styles.tabTextBlue)
              ]}>
                {tab === 'interventions' ? ' AI Interventions' : ' City Report'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </LinearGradient>

      <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent} showsVerticalScrollIndicator={false}>

        {/* ── INTERVENTIONS TAB ── */}
        {activeTab === 'interventions' && (
          <View style={styles.section}>
            {/* Summary card */}
            {cityData?.overall_summary && (
              <View style={styles.summaryCard}>
                <Text style={styles.sectionLabel}>ℹ  City Analysis</Text>
                <Text style={styles.summaryText}>{cityData.overall_summary}</Text>
              </View>
            )}

            {/* Shadow card */}
            {cityData?.shadow_msg && (
              <View style={styles.shadowCard}>
                <Text style={styles.shadowTitle}> Shadow Modeling (July 2PM)</Text>
                <Text style={styles.shadowMsg}>{cityData.shadow_msg}</Text>
                {cityData.tree_recommendation_side && (
                  <View style={styles.treeBadge}>
                    <Text style={styles.treeText}> Plant trees on: {cityData.tree_recommendation_side}</Text>
                  </View>
                )}
              </View>
            )}

            {/* Intervention cards */}
            {interventions.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionDivider}>── AI RECOMMENDATIONS ──</Text>
                {interventions.map((inv, idx) => (
                  <InterventionCard
                    key={idx}
                    intervention={inv}
                    index={idx}
                    expanded={expandedInsight === idx}
                    onToggleExpand={() => setExpandedInsight(expandedInsight === idx ? null : idx)}
                  />
                ))}
              </View>
            )}
          </View>
        )}

        {/* ── CITY REPORT TAB ── */}
        {activeTab === 'report' && (
          <View style={styles.section}>
            {/* Global Control Room */}
            <View style={styles.controlCard}>
              <Text style={styles.controlTitle}>⚡ Global Control Room</Text>
              <Text style={styles.controlSub}>Simulate AI recommendations city-wide</Text>

              {/* Impact metrics */}
              <View style={styles.impactRow}>
                {[
                  { label: 'City Temp', value: `${Math.max(0, avgLST - totalTempReduction).toFixed(1)}°C`, color: totalTempReduction > 0 ? Colors.accent : Colors.text, suffix: totalTempReduction > 0 ? `-${totalTempReduction.toFixed(1)}°` : undefined },
                  { label: 'Energy Saved', value: `${totalEnergy.toFixed(0)} MWh`, color: Colors.amber },
                  { label: 'CO₂ Avoided', value: `${co2.toFixed(0)} T`, color: Colors.blue },
                ].map(metric => (
                  <View key={metric.label} style={styles.impactBlock}>
                    <Text style={styles.impactLabel}>{metric.label}</Text>
                    <Text style={[styles.impactValue, { color: metric.color }]}>{metric.value}</Text>
                    {metric.suffix && (
                      <Text style={styles.impactSuffix}>{metric.suffix}</Text>
                    )}
                  </View>
                ))}
              </View>

              {/* Sliders */}
              {interventions.length > 0 ? (
                <View style={styles.slidersBlock}>
                  <Text style={styles.sectionLabel}>Adjust Interventions</Text>
                  {interventions.map(inv => {
                    const rules = getInterventionRules(inv.icon);
                    return (
                      <GestureSlider
                        key={inv.type}
                        label={inv.type}
                        value={simulationState[inv.type] ?? 0}
                        max={rules.max}
                        step={rules.step}
                        unit={rules.unit}
                        accentColor={rules.color}
                        onChange={val => handleSimChange(inv.type, val)}
                      />
                    );
                  })}
                </View>
              ) : (
                <Text style={styles.noData}>No simulation variables. Run an analysis first.</Text>
              )}
            </View>

            {/* Zone counts */}
            {Object.keys(zoneCounts).length > 0 && (
              <View style={styles.zoneGrid}>
                {[
                  { key: 'misting_zone', label: ' Misting', color: Colors.cyan },
                  { key: 'reflective_roof_zone', label: ' Cool Roof', color: Colors.pink },
                  { key: 'green_corridor_zone', label: ' Corridor', color: Colors.violet },
                ].map(z => (
                  <View key={z.key} style={[styles.zoneCard, { borderColor: z.color + '40' }]}>
                    <Text style={[styles.zoneCount, { color: z.color }]}>{zoneCounts[z.key] ?? 0}</Text>
                    <Text style={[styles.zoneLabel, { color: z.color }]}>{z.label}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  emptyState: { alignItems: 'center', justifyContent: 'center', padding: Spacing.xl, gap: 12 },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { color: Colors.text, fontSize: 20, fontWeight: '700' },
  emptyMsg: { color: Colors.textMuted, fontSize: 14, textAlign: 'center', lineHeight: 20 },
  loadingRing: {
    width: 48, height: 48, borderRadius: 24,
    borderWidth: 3, borderColor: Colors.accent,
    borderTopColor: 'transparent',
    marginBottom: 12,
  },

  header: { paddingHorizontal: Spacing.md, paddingTop: Spacing.md, paddingBottom: 0 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.md },
  cityName: { color: Colors.text, fontSize: 22, fontWeight: '800' },
  headerSub: { color: Colors.textFaint, fontSize: 11, marginTop: 2 },
  lstBadge: { borderRadius: Radius.md, borderWidth: 1, padding: 8, alignItems: 'center' },
  lstText: { fontSize: 18, fontWeight: '700' },
  lstSub: { color: Colors.textFaint, fontSize: 9, marginTop: 2 },

  pillRow: { flexDirection: 'row', gap: 8, marginBottom: Spacing.md },
  pill: {
    flex: 1,
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    padding: 10,
  },
  pillHeader: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
  pillEmoji: { fontSize: 10 },
  pillLabel: { color: Colors.textFaint, fontSize: 9, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  pillValue: { fontSize: 20, fontWeight: '700' },

  tabBar: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: Colors.borderLight, marginTop: 4 },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: {},
  tabText: { color: Colors.textFaint, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  tabTextGreen: { color: Colors.accent },
  tabTextBlue: { color: Colors.blue },

  body: { flex: 1 },
  bodyContent: { padding: Spacing.md, paddingBottom: 100 },
  section: { gap: 10 },

  sectionLabel: { color: Colors.textFaint, fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  sectionDivider: { color: Colors.textFaint, fontSize: 10, fontWeight: '700', textAlign: 'center', letterSpacing: 1, marginVertical: 4 },

  summaryCard: {
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    padding: Spacing.md,
    gap: 6,
  },
  summaryText: { color: '#cbd5e1', fontSize: 13, lineHeight: 18 },

  shadowCard: {
    backgroundColor: 'rgba(92,45,0,0.15)',
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.25)',
    padding: Spacing.md,
    gap: 6,
  },
  shadowTitle: { color: Colors.amber, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  shadowMsg: { color: '#cbd5e1', fontSize: 12, lineHeight: 18 },
  treeBadge: {
    backgroundColor: 'rgba(16,185,129,0.1)',
    borderRadius: 6,
    padding: 6,
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.2)',
  },
  treeText: { color: Colors.accent, fontSize: 11, fontWeight: '600' },

  controlCard: {
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    padding: Spacing.md,
    gap: 10,
    marginBottom: 10,
  },
  controlTitle: { color: Colors.text, fontSize: 16, fontWeight: '700' },
  controlSub: { color: Colors.textFaint, fontSize: 11, marginTop: -6 },
  impactRow: {
    flexDirection: 'row',
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: Colors.borderLight,
    gap: Spacing.md,
  },
  impactBlock: { flex: 1, alignItems: 'center' },
  impactLabel: { color: Colors.textFaint, fontSize: 9, fontWeight: '700', textTransform: 'uppercase', marginBottom: 2 },
  impactValue: { fontSize: 18, fontWeight: '700' },
  impactSuffix: { color: Colors.accent, fontSize: 9, fontWeight: '600' },
  slidersBlock: { gap: 2 },
  noData: { color: Colors.textFaint, fontSize: 12, textAlign: 'center', paddingVertical: 8 },

  zoneGrid: { flexDirection: 'row', gap: 8 },
  zoneCard: {
    flex: 1,
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.md,
    borderWidth: 1,
    padding: Spacing.sm,
    alignItems: 'center',
    gap: 4,
  },
  zoneCount: { fontSize: 24, fontWeight: '700' },
  zoneLabel: { fontSize: 10, fontWeight: '600' },
});
