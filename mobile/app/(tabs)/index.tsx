import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Text,
  ActivityIndicator,
  Platform,
  StatusBar,
  Animated
} from 'react-native';
import MapLibreGL from '@maplibre/maplibre-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useCityContext } from '@/context/CityContext';
import SearchBar from '@/components/SearchBar';
import LayerToggle from '@/components/LayerToggle';
import StreetReportSheet from '@/components/StreetReportSheet';
import { Colors, Spacing, Radius } from '@/constants/theme';

function getBuildingColorExpr(activeLayers: Set<string>) {
  return activeLayers.has('heat')
    ? [
        'interpolate',
        ['linear'],
        ['get', 'simulated_lst'],
        28,
        '#fcd34d',
        32,
        '#f97316',
        36,
        '#ef4444',
        40,
        '#7f1d1d'
      ]
    : '#334155';
}

export default function MapScreen() {
  const {
    loading,
    loadingMessage,
    cityData,
    cityName,
    selectedFeature,
    setSelectedFeature,
    simulationState,
    activeLayers,
    handleSearch,
    handleSimChange,
    handleLayerToggle
  } = useCityContext();

  const [mapCenter, setMapCenter] = useState<[number, number]>([0, 20]);
  const [mapZoom, setMapZoom] = useState<number>(2);

  const [searchExpanded, setSearchExpanded] = useState(false);

  const toggleOffset = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(toggleOffset, {
      toValue: searchExpanded ? 90 : 0,
      duration: 250,
      useNativeDriver: false
    }).start();
  }, [searchExpanded]);

  const parkData = useMemo(
    () => cityData?.osm_features?.parks ?? null,
    [cityData]
  );

  const roadData = useMemo(
    () => cityData?.osm_features?.roads ?? null,
    [cityData]
  );

  const buildingData = useMemo(
    () => cityData?.osm_features?.buildings ?? null,
    [cityData]
  );

  const handleFeaturePress = (event: any) => {
    const feature = event.features?.[0];
    if (feature) {
      setSelectedFeature(feature);
    }
  };

  const handleSearchWithFit = (name: string, lat: number, lng: number) => {
    if (lat !== 0 && lng !== 0) {
      setMapCenter([lng, lat]);
      setMapZoom(14.5);
    }
    handleSearch(name, lat, lng);
  };

  return (
    <View style={styles.container}>
      <MapLibreGL.MapView
        style={StyleSheet.absoluteFillObject}
        mapStyle="https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"
        logoEnabled={false}
        compassEnabled={false}
        onPress={() => setSelectedFeature(null)}
      >
        <MapLibreGL.Camera
          centerCoordinate={mapCenter}
          zoomLevel={mapZoom}
          pitch={50}
          animationDuration={1000}
        />

        {parkData && (
          <MapLibreGL.ShapeSource id="parks" shape={parkData as any}>
            <MapLibreGL.FillLayer
              id="parks-fill"
              style={{
                fillColor: '#166534',
                fillOpacity: 0.6
              }}
            />
          </MapLibreGL.ShapeSource>
        )}

        {roadData && (
          <MapLibreGL.ShapeSource id="roads" shape={roadData as any}>
            <MapLibreGL.LineLayer
              id="roads-line"
              style={{
                lineColor: '#475569',
                lineWidth: 2
              }}
            />
          </MapLibreGL.ShapeSource>
        )}

        {buildingData && (
          <MapLibreGL.ShapeSource
            id="buildings"
            shape={buildingData as any}
            onPress={handleFeaturePress}
          >
            <MapLibreGL.FillExtrusionLayer
              id="buildings-3d"
              minZoomLevel={12}
              style={{
                fillExtrusionColor: getBuildingColorExpr(activeLayers) as any,
                fillExtrusionHeight: 12,
                fillExtrusionOpacity: 0.9
              }}
            />
          </MapLibreGL.ShapeSource>
        )}
      </MapLibreGL.MapView>

      {/* Top UI */}
      <View style={styles.topBar}>
        <SearchBar
          onSearch={handleSearchWithFit}
          loading={loading}
          onResultsVisibleChange={setSearchExpanded}
        />

        {cityData && (
          <Animated.View
            style={[
              styles.layerToggleContainer,
              { marginTop: toggleOffset }
            ]}
          >
            <LayerToggle
              activeLayers={activeLayers}
              onToggle={handleLayerToggle as any}
            />
          </Animated.View>
        )}
      </View>

      {cityData && !loading && (
        <View style={styles.metricsChip}>
          <Text style={styles.metricText}>
            🌡{' '}
            <Text style={{ color: Colors.red }}>
              {cityData.gee_metrics.avg_lst_celsius.toFixed(1)}°C
            </Text>
            {'   '}
            NDVI{' '}
            <Text style={{ color: Colors.accent }}>
              {cityData.gee_metrics.avg_ndvi.toFixed(2)}
            </Text>
            {'   '}
            <Text style={{ color: Colors.textMuted }}>
              {cityName.split(',')[0]}
            </Text>
          </Text>
        </View>
      )}

      {loading && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingCard}>
            <ActivityIndicator
              size="large"
              color={Colors.accent}
              style={{ marginBottom: 12 }}
            />
            <Text style={styles.loadingTitle}>Analyzing City</Text>
            <Text style={styles.loadingMsg}>{loadingMessage}</Text>
          </View>
        </View>
      )}

      {selectedFeature && (
        <StreetReportSheet
          feature={selectedFeature}
          avgLST={cityData?.gee_metrics.avg_lst_celsius ?? 30}
          interventions={cityData?.ai_interventions ?? []}
          simulationState={simulationState}
          onSimChange={handleSimChange}
          onClose={() => setSelectedFeature(null)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg
  },

  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    gap: 8,
    flexDirection: 'column',
    paddingHorizontal: Spacing.md,
    paddingTop:
      Platform.OS === 'android'
        ? (StatusBar.currentHeight || 0) + 12
        : 12,
    zIndex: 20,
    elevation: 50
  },

  layerToggleContainer: {
    alignItems: 'flex-end'
  },

  metricsChip: {
    position: 'absolute',
    bottom: 110,
    left: Spacing.lg,
    right: Spacing.lg,
    backgroundColor: 'rgba(15,23,42,0.8)',
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 10,
    alignItems: 'center'
  },

  metricText: {
    color: Colors.text,
    fontSize: 12,
    fontWeight: '600'
  },

  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(2,6,23,0.85)',
    alignItems: 'center',
    justifyContent: 'center'
  },

  loadingCard: {
    backgroundColor: 'rgba(15,23,42,0.95)',
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    alignItems: 'center',
    minWidth: 280
  },

  loadingTitle: {
    color: Colors.text,
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 8
  },

  loadingMsg: {
    color: Colors.accent,
    fontSize: 13,
    textAlign: 'center'
  }
});