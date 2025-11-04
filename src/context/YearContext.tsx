'use client';

import { createContext, useContext, useState, useEffect, useMemo, useRef, type ReactNode } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import useSWR from 'swr';
import type { AppYear } from '@/types';

const fetcher = (url: string) => fetch(url).then(r => r.json());

type YearContextType = {
  year: number;
  setYear: (year: number) => void;
  years: AppYear[];
  currentYearSettings: AppYear | null;
  isLoading: boolean;
};

const YearContext = createContext<YearContextType | undefined>(undefined);

export function YearProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  // Fetch all years
  const { data: years = [], isLoading } = useSWR<AppYear[]>('/api/admin/years', fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
  });
  
  // Determine default year: from URL, localStorage, or latest year
  const preferredYear = useMemo(() => {
    // 1. Try URL param
    const urlYear = searchParams?.get('year');
    if (urlYear) {
      const parsed = parseInt(urlYear, 10);
      if (!isNaN(parsed)) return parsed;
    }
    
    // 2. Try localStorage
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('selectedYear');
      if (stored) {
        const parsed = parseInt(stored, 10);
        if (!isNaN(parsed)) return parsed;
      }
    }
    
    // 3. Default to latest year from API or 2025
    if (years.length > 0) {
      return years[0].year; // years are sorted descending
    }
    
    return 2025;
  }, [searchParams, years]);
  
  const [year, setYearState] = useState<number>(preferredYear);
  const hasInitializedRef = useRef(false);

  // Keep local state in sync with the URL when users navigate via browser controls
  useEffect(() => {
    const urlYear = searchParams?.get('year');
    if (!urlYear) {
      return;
    }
    const parsed = parseInt(urlYear, 10);
    if (!isNaN(parsed) && parsed !== year) {
      hasInitializedRef.current = true;
      setYearState(parsed);
    }
  }, [searchParams, year]);

  // Apply default year once data is loaded and ensure the selected year stays valid
  useEffect(() => {
    if (isLoading) {
      return;
    }

    if (!hasInitializedRef.current) {
      hasInitializedRef.current = true;
      if (year !== preferredYear) {
        setYearState(preferredYear);
      }
      return;
    }

    if (years.length > 0 && !years.some((entry) => entry.year === year)) {
      setYearState(years[0].year);
    }
  }, [isLoading, preferredYear, year, years]);
  
  const setYear = (newYear: number) => {
    hasInitializedRef.current = true;
    setYearState(newYear);
    
    // Update URL
    const params = new URLSearchParams(searchParams?.toString() || '');
    params.set('year', newYear.toString());
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
    
    // Update localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('selectedYear', newYear.toString());
    }
  };
  
  const currentYearSettings = years.find(y => y.year === year) || null;
  
  const value = {
    year,
    setYear,
    years,
    currentYearSettings,
    isLoading,
  };
  
  return <YearContext.Provider value={value}>{children}</YearContext.Provider>;
}

export function useYear() {
  const context = useContext(YearContext);
  if (context === undefined) {
    throw new Error('useYear must be used within a YearProvider');
  }
  return context;
}

