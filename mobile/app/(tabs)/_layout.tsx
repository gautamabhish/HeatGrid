import { Tabs } from 'expo-router';
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { CityProvider } from '@/context/CityContext';
import { Colors } from '@/constants/theme';

function TabIcon({ emoji, label, focused }: { emoji: string; label: string; focused: boolean }) {
  return (
    <View style={tabIcon.container}>
      <Text style={[tabIcon.emoji, focused && tabIcon.emojiActive]}>{emoji}</Text>
      <Text style={[tabIcon.label, { color: focused ? Colors.accent : Colors.textFaint }]}>{label}</Text>
    </View>
  );
}

const tabIcon = StyleSheet.create({
  container: { alignItems: 'center', gap: 2, paddingTop: 4 },
  emoji: { fontSize: 20, opacity: 0.5 },
  emojiActive: { opacity: 1 },
  label: { fontSize: 10, fontWeight: '600' },
});

export default function TabLayout() {
  return (
    <CityProvider>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: '#0d1a2d',
            borderTopColor: 'rgba(255,255,255,0.07)',
            borderTopWidth: 1,
            height: 70,
            paddingBottom: 8,
          },
          tabBarActiveTintColor: Colors.accent,
          tabBarInactiveTintColor: Colors.textFaint,
          tabBarShowLabel: false,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Map',
            tabBarIcon: ({ focused }) => <TabIcon emoji="🗺️" label="Map" focused={focused} />,
          }}
        />
        <Tabs.Screen
          name="report"
          options={{
            title: 'Report',
            tabBarIcon: ({ focused }) => <TabIcon emoji="📊" label="Report" focused={focused} />,
          }}
        />
      </Tabs>
    </CityProvider>
  );
}
