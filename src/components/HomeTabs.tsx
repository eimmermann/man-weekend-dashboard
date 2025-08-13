"use client";

import { useState } from 'react';
import Attendees from '@/components/Attendees';
import Expenses from '@/components/Expenses';
import TotalSpend from '@/components/TotalSpend';
import TripMap from '@/components/TripMap';
import { Suspense } from 'react';
import PokemonOfTheDay from '@/components/PokemonOfTheDay';
import StuffTracker from '@/components/StuffTracker';
import PickleballTracker from '@/components/PickleballTracker';
import RandomPicker from '@/components/RandomPicker';
import PokerTracker from '@/components/PokerTracker';
import Schedule from '@/components/Schedule';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

type TabKey = 'planning' | 'weekend' | 'bill';

export default function HomeTabs() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const initialTab = (() => {
    const t = searchParams.get('tab');
    return (t === 'planning' || t === 'weekend' || t === 'bill') ? (t as TabKey) : 'planning';
  })();

  const [tab, setTab] = useState<TabKey>(initialTab);

  // Keep state in sync when user navigates via back/forward or shares URL
  // This effect runs when search params change
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const spKey = searchParams.toString();
  if (typeof window !== 'undefined') {
    // lightweight sync without useEffect to avoid hydration warnings with next/navigation
    const t = searchParams.get('tab');
    const nextTab: TabKey = (t === 'planning' || t === 'weekend' || t === 'bill') ? (t as TabKey) : 'planning';
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

  

  return (
    <div className="space-y-6">
      <div className="flex justify-center">
        <div className="inline-flex items-center gap-2 rounded-2xl bg-white/5 backdrop-blur-xl ring-1 ring-white/10 px-2.5 py-2">
          <TabButton label="Planning" active={tab === 'planning'} onClick={() => handleTabChange('planning')} />
          <TabButton label="Weekend Of" active={tab === 'weekend'} onClick={() => handleTabChange('weekend')} />
          <TabButton label="The Bill" active={tab === 'bill'} onClick={() => handleTabChange('bill')} />
        </div>
      </div>

      {tab === 'planning' && (
        <div className="space-y-6">
          <PokemonOfTheDay />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Attendees />
            <Suspense fallback={null}>
              <TripMap />
            </Suspense>
          </div>
          <StuffTracker />
        </div>
      )}

      {tab === 'weekend' && (
        <div className="space-y-6">
          <Schedule />
          <RandomPicker />
          <PokerTracker />
          <PickleballTracker />
        </div>
      )}

      {tab === 'bill' && (
        <div className="space-y-6">
          <Expenses />
          <TotalSpend />
        </div>
      )}
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


