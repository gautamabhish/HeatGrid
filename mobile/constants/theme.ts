// Constants: theme colors, spacing, and API base URL

export const Colors = {
  bg: '#020617',         // slate-950
  bgCard: '#0f172a',     // slate-900
  bgCardAlt: '#1e293b',  // slate-800
  border: '#1e293b',     // slate-800
  borderLight: 'rgba(255,255,255,0.08)',
  text: '#f1f5f9',       // slate-100
  textMuted: '#94a3b8',  // slate-400
  textFaint: '#475569',  // slate-600
  accent: '#10b981',     // emerald-500
  accentDim: '#064e3b',  // emerald-950
  red: '#ef4444',
  orange: '#f97316',
  amber: '#f59e0b',
  yellow: '#fcd34d',
  blue: '#3b82f6',
  cyan: '#22d3ee',
  violet: '#a78bfa',
  pink: '#f472b6',
  lime: '#a3e635',
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

export const Radius = {
  sm: 10,
  md: 16,
  lg: 24,
  xl: 32,
  full: 999,
};

// Change this to your machine's LAN IP when testing on a physical device
// e.g. 'http://192.168.1.100:8000'
export const API_BASE_URL = 'http://10.226.247.210:8000';
