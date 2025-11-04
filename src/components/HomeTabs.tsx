"use client";

import { useState, useEffect, useMemo } from 'react';
import Attendees from '@/components/Attendees';
import Expenses from '@/components/Expenses';
import TotalSpend from '@/components/TotalSpend';
import FinalBill from '@/components/FinalBill';
import TripMap from '@/components/TripMap';
import { Suspense } from 'react';
import PokemonOfTheDay from '@/components/PokemonOfTheDay';
import Countdown from '@/components/Countdown';
import StuffTracker from '@/components/StuffTracker';
import PickleballTracker from '@/components/PickleballTracker';
import RandomPicker from '@/components/RandomPicker';
import PokerTracker from '@/components/PokerTracker';
import Schedule from '@/components/Schedule';
import WeekendSelector from '@/components/WeekendSelector';
import AdminYearModal from '@/components/AdminYearModal';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useYear } from '@/context/YearContext';

type TabKey = 'overview' | 'planning' | 'schedule' | 'games' | 'bill';

export default function HomeTabs() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { year, setYear, years, currentYearSettings } = useYear();
  const [showAdminModal, setShowAdminModal] = useState(false);
  
  // Check if trip dates are set for the selected year
  const hasTripDates = useMemo(() => {
    return Boolean(currentYearSettings?.tripStartDate && currentYearSettings?.tripEndDate);
  }, [currentYearSettings]);
  
  // Add keyboard shortcut for admin modal (Ctrl+Alt+S)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.altKey && e.key === 's') {
        e.preventDefault();
        setShowAdminModal(true);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const initialTab = (() => {
    const t = searchParams.get('tab');
    const allowed: TabKey[] = ['overview', 'planning', 'schedule', 'games', 'bill'];
    return (allowed.includes((t as TabKey))) ? (t as TabKey) : 'overview';
  })();

  const [tab, setTab] = useState<TabKey>(initialTab);

  // Keep state in sync when user navigates via back/forward or shares URL
  if (typeof window !== 'undefined') {
    // lightweight sync without useEffect to avoid hydration warnings with next/navigation
    const t = searchParams.get('tab');
    const allowed: TabKey[] = ['overview', 'planning', 'schedule', 'games', 'bill'];
    const nextTab: TabKey = allowed.includes((t as TabKey)) ? (t as TabKey) : 'overview';
    if (nextTab !== tab) {
      // set state when URL drives a different tab
      // note: this runs during render but only when values differ; React batches this safely in client components
      setTab(nextTab);
    }
  }

  const handleTabChange = (next: TabKey) => {
    if (next === tab) return;
    setTab(next);
    const params = new URLSearchParams(searchParams);
    params.set('tab', next);
    router.push(`${pathname}?${params.toString()}`);
  };

  

  // If no trip dates are set, only show WeekendSelector
  if (!hasTripDates) {
    return (
      <div className="space-y-6 pb-24">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-white mb-2">Man Weekend {year}</h2>
          <p className="text-slate-400">Select a weekend for your trip</p>
        </div>
        
        <WeekendSelector />
        
        {/* Year selector only */}
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50">
          <div className="inline-flex items-center gap-3 rounded-2xl bg-black/40 backdrop-blur-2xl ring-1 ring-white/20 px-4 py-2.5 shadow-[0_20px_40px_-12px_rgba(0,0,0,0.6)]">
            <span className="text-sm text-slate-300">Year:</span>
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="bg-slate-800/80 text-white px-3 py-1.5 rounded-lg border border-slate-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
            >
              {years.map((y) => (
                <option key={y.year} value={y.year}>
                  {y.year}
                </option>
              ))}
            </select>
          </div>
        </div>
        
        {showAdminModal && <AdminYearModal onClose={() => setShowAdminModal(false)} />}
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24">
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50">
        <div className="inline-flex items-center gap-2 rounded-2xl bg-black/40 backdrop-blur-2xl ring-1 ring-white/20 px-2.5 py-2 shadow-[0_20px_40px_-12px_rgba(0,0,0,0.6)]">
          <TabButton label="Overview" active={tab === 'overview'} onClick={() => handleTabChange('overview')} />
          <TabButton label="Planning" active={tab === 'planning'} onClick={() => handleTabChange('planning')} />
          <TabButton label="Schedule" active={tab === 'schedule'} onClick={() => handleTabChange('schedule')} />
          <TabButton label="Games" active={tab === 'games'} onClick={() => handleTabChange('games')} />
          <TabButton label="Money" active={tab === 'bill'} onClick={() => handleTabChange('bill')} />
          
          {/* Year selector */}
          <div className="ml-2 flex items-center gap-2 border-l border-white/20 pl-2">
            <span className="text-xs text-slate-300">Year:</span>
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="bg-slate-800/80 text-white text-sm px-2 py-1 rounded-md border border-slate-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
            >
              {years.map((y) => (
                <option key={y.year} value={y.year}>
                  {y.year}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {tab === 'overview' && (
        <div className="space-y-6">
          <Countdown />
          <PokemonOfTheDay />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Attendees />
            <Suspense fallback={null}>
              <TripMap />
            </Suspense>
          </div>
        </div>
      )}

      {tab === 'planning' && (
        <div className="space-y-6">
          <StuffTracker />
        </div>
      )}

      {tab === 'schedule' && (
        <div className="space-y-6">
          <Schedule />
        </div>
      )}

      {tab === 'games' && (
        <div className="space-y-6">
          <RandomPicker />
          <PokerTracker />
          <PickleballTracker />
        </div>
      )}

      {tab === 'bill' && (
        <div className="space-y-6">
          <Expenses />
          <TotalSpend />
          <FinalBill />
        </div>
      )}
      
      {showAdminModal && <AdminYearModal onClose={() => setShowAdminModal(false)} />}
    </div>
  );
}

function TabButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 md:px-4 md:py-2 text-sm md:text-base rounded-full transition ${
        active
          ? 'bg-gradient-to-r from-indigo-500 to-cyan-500 text-white shadow'
          : 'text-slate-100 hover:bg-white/10'
      }`}
      aria-current={active ? 'page' : undefined}
    >
      {label}
    </button>
  );
}

//


