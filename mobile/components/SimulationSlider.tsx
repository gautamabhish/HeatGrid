import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Slider from '@react-native-community/slider';
import { Colors, Radius, Spacing } from '@/constants/theme';

interface SimulationSliderProps {
  label: string;
  value: number;
  max: number;
  step: number;
  unit: string;
  accentColor: string;
  onChange: (val: number) => void;
}

export default function SimulationSlider({
  label,
  value,
  max,
  step,
  unit,
  accentColor,
  onChange
}: SimulationSliderProps) {

  const [localVal, setLocalVal] = React.useState(value);
  const isSliding = React.useRef(false);

  React.useEffect(() => {
    if (!isSliding.current) {
      setLocalVal(value);
    }
  }, [value]);

  return (
    <View style={styles.container}>

      <View style={styles.rowHeader}>
        <Text style={styles.label}>{label}</Text>
        <Text style={[styles.value, { color: accentColor }]}>
          {Math.round(localVal)}{unit}
        </Text>
      </View>

      <Slider
        style={styles.slider}
        minimumValue={0}
        maximumValue={max}
        step={step}
        value={localVal}

        onSlidingStart={() => {
          isSliding.current = true;
        }}

        onValueChange={(v) => {
          setLocalVal(v);
        }}

        onSlidingComplete={(v) => {
          isSliding.current = false;
          onChange(v);
        }}

        minimumTrackTintColor={accentColor}
        maximumTrackTintColor={Colors.bgCardAlt}
        thumbTintColor={accentColor}
      />

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
    alignItems: 'center',
    marginBottom: 2,
  },

  label: {
    color: Colors.text,
    fontSize: 13,
    fontWeight: '600',
    opacity: 0.9,
  },

  value: {
    fontSize: 13,
    fontWeight: '800',
  },

  slider: {
    width: '100%',
    height: 32,
    marginTop: 4,
  },
});