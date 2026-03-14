import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  TextInput,
  FlatList,
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  Keyboard
} from 'react-native';
import { Colors, Radius, Spacing } from '@/constants/theme';

interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  type: string;
}

interface SearchBarProps {
  onSearch: (placeName: string, lat: number, lng: number) => void;
  loading: boolean;

  // NEW
  onResultsVisibleChange?: (visible: boolean) => void;
}

const formatShort = (r: NominatimResult) =>
  r.display_name.split(', ').slice(0, 3).join(', ');

const formatSub = (r: NominatimResult) => {
  const parts = r.display_name.split(', ');
  return parts.slice(3).join(', ') || r.type;
};

export default function SearchBar({
  onSearch,
  loading,
  onResultsVisibleChange
}: SearchBarProps) {

  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<NominatimResult[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [fetching, setFetching] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchSuggestions = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    setFetching(true);

    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=6&addressdetails=1`,
        {
          headers: {
            'Accept-Language': 'en',
            'User-Agent': 'AnyCityHeatMapperApp/1.0'
          }
        }
      );

      const data: NominatimResult[] = await res.json();

      setSuggestions(data);
      setShowDropdown(data.length > 0);

    } catch (err) {
      console.error('Search error', err);
      setSuggestions([]);
      setShowDropdown(false);
    } finally {
      setFetching(false);
    }

  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      fetchSuggestions(query);
    }, 350);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };

  }, [query, fetchSuggestions]);

  // 🔔 Notify parent when dropdown changes
  useEffect(() => {
    onResultsVisibleChange?.(showDropdown);
  }, [showDropdown]);

  const selectSuggestion = (result: NominatimResult) => {

    setQuery(formatShort(result));

    setShowDropdown(false);
    setSuggestions([]);

    Keyboard.dismiss();

    onSearch(
      result.display_name,
      parseFloat(result.lat),
      parseFloat(result.lon)
    );
  };

  return (
    <View style={styles.container}>

      <View style={styles.inputRow}>

        <TextInput
          style={styles.input}
          placeholder="Search any city, street..."
          placeholderTextColor={Colors.textFaint}
          value={query}
          onChangeText={v => {
            setQuery(v);
            if (!v) setSuggestions([]);
          }}
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
          onSubmitEditing={() => query.trim() && onSearch(query.trim(), 0, 0)}
          onFocus={() => suggestions.length > 0 && setShowDropdown(true)}
        />

        {(fetching || loading) ? (
          <ActivityIndicator size="small" color={Colors.accent} style={styles.spinner} />
        ) : query.length > 0 ? (
          <TouchableOpacity
            onPress={() => {
              setQuery('');
              setSuggestions([]);
              setShowDropdown(false);
            }}
          >
            <Text style={styles.clearIcon}>✕</Text>
          </TouchableOpacity>
        ) : null}

      </View>

      {showDropdown && suggestions.length > 0 && (
        <View style={styles.dropdown}>

          <FlatList
            data={suggestions}
            keyExtractor={item => String(item.place_id)}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (

              <TouchableOpacity
                style={styles.suggestionItem}
                onPress={() => selectSuggestion(item)}
              >

                <View style={styles.suggestionText}>
                  <Text style={styles.suggestionMain} numberOfLines={1}>
                    {formatShort(item)}
                  </Text>

                  <Text style={styles.suggestionSub} numberOfLines={1}>
                    {formatSub(item)}
                  </Text>
                </View>

              </TouchableOpacity>

            )}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />

        </View>
      )}

    </View>
  );
}

const styles = StyleSheet.create({

  container: {
    position: 'relative',
    zIndex: 100
  },

  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15,23,42,0.92)',
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    elevation: 8
  },

  input: {
    flex: 1,
    color: Colors.text,
    fontSize: 14
  },

  clearIcon: {
    fontSize: 14,
    color: Colors.textMuted
  },

  spinner: {
    marginLeft: 8
  },

  dropdown: {
    position: 'absolute',
    top: '100%',
    marginTop: 8,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(15,23,42,0.97)',
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    maxHeight: 280
  },

  suggestionItem: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 12
  },

  suggestionText: { flex: 1 },

  suggestionMain: {
    color: Colors.text,
    fontSize: 13,
    fontWeight: '600'
  },

  suggestionSub: {
    color: Colors.textFaint,
    fontSize: 11,
    marginTop: 2
  },

  separator: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginHorizontal: Spacing.md
  }

});