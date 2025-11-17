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
  const { year, setYear, years, currentYearSettings, isLoading } = useYear();
  const [showAdminModal, setShowAdminModal] = useState(false);
  
  // Only force the weekend picker when we know the current year settings and dates are missing
  const shouldShowWeekendPicker = useMemo(() => {
    if (isLoading || !currentYearSettings) return false;
    return !(currentYearSettings.tripStartDate && currentYearSettings.tripEndDate);
  }, [currentYearSettings, isLoading]);
  
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

  const handleYearChange: React.ChangeEventHandler<HTMLSelectElement> = (event) => {
    const nextYear = Number.parseInt(event.target.value, 10);
    if (!Number.isNaN(nextYear) && nextYear !== year) {
      setYear(nextYear);
    }
  };

  

  // If no trip dates are set, only show WeekendSelector
  if (shouldShowWeekendPicker) {
    return (
      <div className="space-y-6 pb-24">
        <div className="mb-6 flex flex-col gap-3 items-center text-center">
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">Man Weekend {year}</h2>
            <p className="text-slate-400">Select a weekend for your trip</p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-2xl bg-white/5 ring-1 ring-white/10 px-4 py-2">
            <span className="text-sm text-slate-300">Year</span>
            <select
              value={year}
              onChange={handleYearChange}
              className="bg-slate-900/80 text-white text-sm px-3 py-1.5 rounded-lg border border-white/20 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
            >
              {years.map((y) => (
                <option key={y.year} value={y.year}>
                  {y.year}
                </option>
              ))}
            </select>
          </div>
        </div>
        
        <WeekendSelector />
        
        {showAdminModal && <AdminYearModal onClose={() => setShowAdminModal(false)} />}
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24">
      {/* Bottom navigation bar */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50">
        <div className="inline-flex items-center gap-2 md:gap-2 rounded-2xl bg-black/40 backdrop-blur-2xl ring-1 ring-white/20 px-2.5 py-2 shadow-[0_20px_40px_-12px_rgba(0,0,0,0.6)]">
          <TabButton label="Overview" icon="🏠" active={tab === 'overview'} onClick={() => handleTabChange('overview')} />
          <TabButton label="Planning" icon="📅" active={tab === 'planning'} onClick={() => handleTabChange('planning')} />
          <TabButton label="Schedule" icon="⏰" active={tab === 'schedule'} onClick={() => handleTabChange('schedule')} />
          <TabButton label="Games" icon="🥒" active={tab === 'games'} onClick={() => handleTabChange('games')} />
          <TabButton label="Money" icon="💰" active={tab === 'bill'} onClick={() => handleTabChange('bill')} />
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

function TabButton({ label, icon, active, onClick }: { label: string; icon: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative flex items-center justify-center rounded-full transition-all ${
        active
          ? 'w-10 h-10 md:w-auto md:h-auto md:px-4 md:py-2 bg-gradient-to-r from-indigo-500 to-cyan-500 text-white shadow-lg'
          : 'w-9 h-9 md:w-auto md:h-auto md:px-3 md:py-1.5 text-slate-100 hover:bg-white/10'
      }`}
      aria-current={active ? 'page' : undefined}
      aria-label={label}
      title={label}
    >
      {/* Icon - visible on mobile, hidden on desktop */}
      <span className="md:hidden text-lg">{icon}</span>

      {/* Text label - hidden on mobile, visible on desktop */}
      <span className="hidden md:inline text-sm md:text-base">{label}</span>
    </button>
  );
}

//
