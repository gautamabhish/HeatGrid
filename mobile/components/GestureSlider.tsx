import React, { useCallback, useRef } from 'react';
import { View, Text, StyleSheet, LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  runOnJS,
  withSpring,
} from 'react-native-reanimated';
import { Colors, Spacing } from '@/constants/theme';

interface GestureSliderProps {
  label: string;
  value: number;
  min?: number;
  max: number;
  step: number;
  unit: string;
  accentColor: string;
  onChange: (val: number) => void;
}

const THUMB = 22;

function snapValue(raw: number, step: number, min: number, max: number): number {
  'worklet';
  const snapped = Math.round((raw - min) / step) * step + min;
  return Math.min(max, Math.max(min, snapped));
}

export default function GestureSlider({
  label,
  value,
  min = 0,
  max,
  step,
  unit,
  accentColor,
  onChange,
}: GestureSliderProps) {
  const trackWidth = useSharedValue(0);
  // fractional 0-1 position
  const progress = useSharedValue((value - min) / (max - min));
  const startProgress = useSharedValue(0);

  const [displayVal, setDisplayVal] = React.useState(value);

  const notifyChange = useCallback((v: number) => {
    setDisplayVal(v);
    onChange(v);
  }, [onChange]);

  // Sync when the external value changes programmatically
  React.useEffect(() => {
    const frac = (value - min) / (max - min);
    progress.value = withSpring(frac, { damping: 100 });
    setDisplayVal(value);
  }, [value, min, max]);

  const pan = Gesture.Pan()
    .minDistance(0)
    .onBegin((e) => {
      const w = trackWidth.value;
      if (w <= 0) return;
      
      // Calculate where the user tapped
      const newFrac = Math.min(1, Math.max(0, (e.x - THUMB / 2) / w));
      
      // Animate to that position with a spring for a "premium" feel
      progress.value = withSpring(newFrac, { damping: 20, stiffness: 150 });
      startProgress.value = newFrac;

      // Update JS state
      const raw = min + newFrac * (max - min);
      const snapped = snapValue(raw, step, min, max);
      runOnJS(notifyChange)(snapped);
    })
    .onUpdate((e) => {
      const w = trackWidth.value;
      if (w <= 0) return;
      
      // During active drag, we use direct assignment for maximum responsiveness
      const newFrac = Math.min(1, Math.max(0, startProgress.value + e.translationX / w));
      progress.value = newFrac;
      
      const raw = min + newFrac * (max - min);
      const snapped = snapValue(raw, step, min, max);
      runOnJS(notifyChange)(snapped);
    })
    .onEnd(() => {
      const raw = min + progress.value * (max - min);
      const snapped = snapValue(raw, step, min, max);
      progress.value = withSpring((snapped - min) / (max - min), { damping: 20 });
    });

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: progress.value * trackWidth.value }],
  }));

  const fillStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%` as any,
  }));

  const onLayout = (e: LayoutChangeEvent) => {
    // usable track width = container width minus one thumb diameter
    trackWidth.value = e.nativeEvent.layout.width - THUMB;
  };

  const displayStr =
    step < 1
      ? displayVal.toFixed(1)
      : String(Math.round(displayVal));

  return (
    <View style={styles.container}>
      <View style={styles.rowHeader}>
        <Text style={styles.label}>{label}</Text>
        <Text style={[styles.valueText, { color: accentColor }]}>
          {displayStr}{unit}
        </Text>
      </View>

      <GestureDetector gesture={pan}>
        <Animated.View style={styles.trackArea} onLayout={onLayout}>
          {/* Track */}
          <View style={styles.track}>
            <Animated.View style={[styles.fill, fillStyle, { backgroundColor: accentColor }]} />
          </View>
          {/* Thumb */}
          <Animated.View
            style={[
              styles.thumb,
              { backgroundColor: accentColor, shadowColor: accentColor },
              thumbStyle,
            ]}
          />
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.sm,
  },
  rowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  label: {
    color: Colors.text,
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  valueText: {
    fontSize: 13,
    fontWeight: '800',
  },
  trackArea: {
    height: THUMB + 8,
    justifyContent: 'center',
    paddingHorizontal: THUMB / 2,
  },
  track: {
    height: 4,
    backgroundColor: Colors.bgCardAlt,
    borderRadius: 2,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 2,
  },
  thumb: {
    position: 'absolute',
    left: 0,
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
    elevation: 4,
  },
});
