import React from 'react';
import { ScrollView, TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { Colors, Radius, Spacing } from '@/constants/theme';

export type ActiveLayer = 'heat' | 'trees' | 'roofs' | 'corridors';

interface LayerToggleProps {
  activeLayers: Set<string>;
  onToggle: (layer: ActiveLayer) => void;
}

const LAYERS: {
  key: ActiveLayer;
  label: string;
  emoji: string;
  activeColor: string;
  activeBg: string;
  activeBorder: string;
}[] = [
    {
      key: 'heat',
      label: 'Heatmap',
      emoji: '',
      activeColor: '#fca5a5',
      activeBg: 'rgba(153,27,27,0.6)',
      activeBorder: 'rgba(239,68,68,0.7)',
    },
    {
      key: 'trees',
      label: 'Trees',
      emoji: '',
      activeColor: '#86efac',
      activeBg: 'rgba(20,83,45,0.6)',
      activeBorder: 'rgba(34,197,94,0.7)',
    },
    {
      key: 'roofs',
      label: 'Cool Roofs',
      emoji: '',
      activeColor: '#c4b5fd',
      activeBg: 'rgba(76,29,149,0.6)',
      activeBorder: 'rgba(167,139,250,0.7)',
    },
    {
      key: 'corridors',
      label: 'Corridors',
      emoji: '',
      activeColor: '#67e8f9',
      activeBg: 'rgba(8,51,68,0.6)',
      activeBorder: 'rgba(34,211,238,0.7)',
    },
  ];

export default function LayerToggle({ activeLayers, onToggle }: LayerToggleProps) {
  return (
    <View style={styles.wrapper}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {LAYERS.map(layer => {
          const isActive = activeLayers.has(layer.key);
          return (
            <TouchableOpacity
              key={layer.key}
              onPress={() => onToggle(layer.key)}
              activeOpacity={0.75}
              style={[
                styles.pill,
                isActive
                  ? {
                    backgroundColor: layer.activeBg,
                    borderColor: layer.activeBorder,
                  }
                  : styles.pillInactive,
              ]}
            >
              <Text style={styles.emoji}>{layer.emoji}</Text>
              <Text
                style={[
                  styles.label,
                  { color: isActive ? layer.activeColor : 'rgba(148,163,184,0.8)' },
                ]}
              >
                {layer.label}
              </Text>
              {/* active indicator dot */}
              {isActive && (
                <View style={[styles.dot, { backgroundColor: layer.activeColor }]} />
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: 'rgba(2,6,23,0.82)',
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.6,
    shadowRadius: 18,
    elevation: 10,
    paddingVertical: 3,
    paddingHorizontal: 4,
  },
  scrollContent: {
    gap: 4,
    flexDirection: 'row',
    alignItems: 'center',
    flexGrow: 1,
    justifyContent: 'space-between',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  pillInactive: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderColor: 'rgba(255,255,255,0.12)',
  },
  emoji: { fontSize: 13 },
  label: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    marginLeft: 1,
  },
});
