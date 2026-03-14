import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors, Radius, Spacing } from '@/constants/theme';
import type { InterventionData } from '@/hooks/useCityAnalysis';

interface InterventionCardProps {
  intervention: InterventionData;
  index: number;
  expanded: boolean;
  onToggleExpand: () => void;
}

const ICON_MAP: Record<string, { emoji: string; color: string; bg: string }> = {
  tree: { emoji: '', color: Colors.lime, bg: 'rgba(26,46,5,0.6)' },
  roof: { emoji: '', color: Colors.pink, bg: 'rgba(80,7,36,0.6)' },
  mist: { emoji: '', color: Colors.cyan, bg: 'rgba(8,51,68,0.6)' },
  corridor: { emoji: '', color: Colors.violet, bg: 'rgba(46,16,101,0.6)' },
  pavement: { emoji: '', color: Colors.blue, bg: 'rgba(23,37,84,0.6)' },
};

const ROI_CONFIG = (score: number) =>
  score >= 70
    ? { color: '#f87171', bg: 'rgba(127,29,29,0.4)', border: 'rgba(239,68,68,0.4)' }
    : score >= 40
      ? { color: '#fbbf24', bg: 'rgba(92,45,0,0.4)', border: 'rgba(245,158,11,0.4)' }
      : { color: Colors.textMuted, bg: Colors.bgCard, border: Colors.border };

export default function InterventionCard({ intervention: inv, index, expanded, onToggleExpand }: InterventionCardProps) {
  const iconCfg = ICON_MAP[inv.icon || ''] ?? { emoji: '⚡', color: '#e879f9', bg: 'rgba(59,7,100,0.6)' };
  const roiCfg = ROI_CONFIG(inv.roi_score ?? 0);

  return (
    <View style={styles.card}>
      {/* Header row */}
      <View style={styles.headerRow}>
        <View style={[styles.iconBadge, { backgroundColor: iconCfg.bg }]}>
          <Text style={styles.iconEmoji}>{iconCfg.emoji}</Text>
        </View>
        <View style={styles.titleBlock}>
          <Text style={styles.title} numberOfLines={1}>{inv.type}</Text>
          <Text style={[styles.priority, { color: Colors.amber }]}>⭐ Priority {index + 1}</Text>
        </View>
        <View style={styles.badges}>
          {inv.roi_score !== undefined && (
            <View style={[styles.badge, { backgroundColor: roiCfg.bg, borderColor: roiCfg.border }]}>
              <Text style={[styles.badgeText, { color: roiCfg.color }]}>ROI {inv.roi_score}</Text>
            </View>
          )}
          <View style={styles.costBadge}>
            <Text style={styles.costText}>{inv.cost_estimate}</Text>
          </View>
        </View>
      </View>

      {/* Target */}
      <Text style={styles.target} numberOfLines={2}>
        <Text style={styles.targetLabel}>Target: </Text>{inv.target}
      </Text>

      {/* Narrative */}
      {inv.narrative && (
        <Text style={styles.narrative}>"{inv.narrative}"</Text>
      )}

      {/* Engineering insight toggle */}
      {inv.engineering_insight && (
        <View style={styles.insightSection}>
          <TouchableOpacity onPress={onToggleExpand} activeOpacity={0.7} style={styles.insightToggle}>
            <Text style={styles.insightToggleText}>
              {expanded ? '▲ Hide engineering insight' : '▼ Why this works'}
            </Text>
          </TouchableOpacity>
          {expanded && (
            <View style={styles.insightBox}>
              <Text style={styles.insightText}>{inv.engineering_insight}</Text>
            </View>
          )}
        </View>
      )}

      {/* Impact pill */}
      <View style={styles.footer}>
        <View style={styles.impactPill}>
          <Text style={styles.impactText}>{inv.impact_estimate}</Text>
        </View>
        <Text style={{ color: Colors.textFaint, fontSize: 14 }}>›</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(30,41,59,0.4)',
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    gap: 12,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  iconEmoji: { fontSize: 16 },
  titleBlock: { flex: 1 },
  title: { color: Colors.text, fontSize: 13, fontWeight: '700' },
  priority: { fontSize: 10, fontWeight: '600', marginTop: 2 },
  badges: { gap: 4, alignItems: 'flex-end' },
  badge: {
    borderRadius: Radius.sm,
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeText: { fontSize: 9, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  costBadge: {
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  costText: { color: Colors.textMuted, fontSize: 9, fontFamily: 'monospace' },
  target: { color: Colors.textMuted, fontSize: 11 },
  targetLabel: { color: Colors.textFaint },
  narrative: {
    color: '#cbd5e1',
    fontSize: 11,
    fontStyle: 'italic',
    lineHeight: 16,
  },
  insightSection: { gap: 4 },
  insightToggle: { paddingVertical: 4 },
  insightToggleText: {
    color: Colors.accent,
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  insightBox: {
    backgroundColor: 'rgba(2,6,23,0.6)',
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  insightText: { color: Colors.textMuted, fontSize: 11, lineHeight: 16 },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: 'rgba(30,41,59,0.8)',
    paddingTop: 8,
    marginTop: 2,
  },
  impactPill: {
    backgroundColor: 'rgba(29,78,216,0.2)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(59,130,246,0.3)',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  impactText: { color: '#93c5fd', fontSize: 11, fontWeight: '600' },
});
