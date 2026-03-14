import React, { createContext, useContext } from 'react';
import { useCityAnalysis } from '@/hooks/useCityAnalysis';

type CityContextType = ReturnType<typeof useCityAnalysis>;

const CityContext = createContext<CityContextType | null>(null);

export function CityProvider({ children }: { children: React.ReactNode }) {
  const cityAnalysis = useCityAnalysis();
  return (
    <CityContext.Provider value={cityAnalysis}>
      {children}
    </CityContext.Provider>
  );
}

export function useCityContext() {
  const ctx = useContext(CityContext);
  if (!ctx) throw new Error('useCityContext must be used inside CityProvider');
  return ctx;
}
