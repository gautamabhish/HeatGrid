'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Loader2, MapPin } from 'lucide-react';

interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  type: string;
  class: string;
  address?: {
    city?: string;
    town?: string;
    state?: string;
    country?: string;
  };
}

interface SearchBarProps {
  onSearch: (placeName: string, lat: number, lng: number) => void;
  loading: boolean;
}

export default function SearchBar({ onSearch, loading }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<NominatimResult[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchSuggestions = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }
    setFetching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=7&addressdetails=1`,
        { headers: { 'Accept-Language': 'en' } }
      );
      const data: NominatimResult[] = await res.json();
      setSuggestions(data);
      setShowDropdown(data.length > 0);
      setActiveIndex(-1);
    } catch {
      setSuggestions([]);
    } finally {
      setFetching(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(query), 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, fetchSuggestions]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current && !inputRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const selectSuggestion = (result: NominatimResult) => {
    setQuery(result.display_name);
    setShowDropdown(false);
    setSuggestions([]);
    onSearch(result.display_name, parseFloat(result.lat), parseFloat(result.lon));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown || suggestions.length === 0) {
      if (e.key === 'Enter' && query.trim()) {
        onSearch(query.trim(), 0, 0);
      }
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(i => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(i => Math.max(i - 1, -1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIndex >= 0) {
        selectSuggestion(suggestions[activeIndex]);
      } else if (query.trim()) {
        // No suggestion selected — fall back to text search (no coords)
        onSearch(query.trim(), 0, 0);
        setShowDropdown(false);
      }
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
      setActiveIndex(-1);
    }
  };

  // Format short display label (city + state + country)
  const formatShort = (r: NominatimResult) => {
    const parts = r.display_name.split(', ');
    // Return first 2-3 meaningful parts
    return parts.slice(0, 3).join(', ');
  };

  const formatSub = (r: NominatimResult) => {
    const parts = r.display_name.split(', ');
    return parts.slice(3).join(', ') || r.type;
  };

  return (
    <div className="relative w-full">
      <div className="relative">
        <Search
          className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
          size={16}
        />
        <input
          ref={inputRef}
          type="text"
          placeholder="Search any city, street, locality..."
          value={query}
          onChange={e => { setQuery(e.target.value); if (!e.target.value) setSuggestions([]); }}
          onKeyDown={handleKeyDown}
          onFocus={() => { if (suggestions.length > 0) setShowDropdown(true); }}
          className="w-full glass-pill rounded-full py-3.5 pl-12 pr-10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/80 transition-all placeholder:text-slate-400 group-hover:border-slate-600 focus:bg-slate-900/90"
          autoComplete="off"
          spellCheck={false}
        />
        {(fetching || loading) && (
          <Loader2
            className="absolute right-4 top-1/2 -translate-y-1/2 text-emerald-500 animate-spin"
            size={16}
          />
        )}
      </div>

      {showDropdown && suggestions.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute top-[calc(100%+8px)] left-0 right-0 glass-panel rounded-2xl z-50 overflow-hidden animate-fade-in-up"
        >
          {suggestions.map((result, idx) => (
            <button
              key={result.place_id}
              className={`w-full flex items-start gap-3 px-4 py-3.5 text-left transition-all duration-200 border-b border-white/5 last:border-b-0 ${
                idx === activeIndex
                  ? 'bg-emerald-500/15 text-white pl-5'
                  : 'text-slate-300 hover:bg-white/5 hover:pl-5'
              }`}
              onClick={() => selectSuggestion(result)}
              onMouseEnter={() => setActiveIndex(idx)}
            >
              <MapPin size={14} className="text-emerald-500 mt-0.5 shrink-0" />
              <div className="min-w-0">
                <div className="font-medium text-sm truncate">{formatShort(result)}</div>
                <div className="text-xs text-slate-500 truncate mt-0.5">{formatSub(result)}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
