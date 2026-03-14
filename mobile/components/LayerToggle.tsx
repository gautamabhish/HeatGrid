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
      activeColor: '#f87171',
      activeBg: 'rgba(127,29,29,0.5)',
      activeBorder: 'rgba(239,68,68,0.5)',
    },
    {
      key: 'trees',
      label: 'Trees',
      emoji: '',
      activeColor: '#a78bfa',
      activeBg: 'rgba(46,16,101,0.5)',
      activeBorder: 'rgba(167,139,250,0.5)',
    },
    {
      key: 'roofs',
      label: 'Cool Roofs',
      emoji: '',
      activeColor: '#f472b6',
      activeBg: 'rgba(80,7,36,0.5)',
      activeBorder: 'rgba(244,114,182,0.5)',
    },
    {
      key: 'corridors',
      label: 'Corridors',
      emoji: '',
      activeColor: '#22d3ee',
      activeBg: 'rgba(8,51,68,0.5)',
      activeBorder: 'rgba(34,211,238,0.5)',
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
              activeOpacity={0.7}
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
                  { color: isActive ? layer.activeColor : Colors.textMuted },
                ]}
              >
                {layer.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: 'rgba(15,23,42,0.85)',
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 15,
    elevation: 8,
    padding: 3,
    maxWidth: '100%',
  },
  scrollContent: {
    gap: 8,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  pillInactive: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderColor: 'rgba(255,255,255,0.05)',
  },
  emoji: { fontSize: 13 },
  label: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
