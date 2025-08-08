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

type TabKey = 'planning' | 'weekend' | 'bill';

export default function HomeTabs() {
  const [tab, setTab] = useState<TabKey>('planning');

  return (
    <div className="space-y-6">
      <div className="flex justify-center">
        <div className="inline-flex items-center gap-2">
          <TabButton label="Planning" active={tab === 'planning'} onClick={() => setTab('planning')} />
          <TabButton label="Weekend Of" active={tab === 'weekend'} onClick={() => setTab('weekend')} />
          <TabButton label="The Bill" active={tab === 'bill'} onClick={() => setTab('bill')} />
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
      className={`px-4 py-2 md:px-5 md:py-2.5 text-sm md:text-base rounded-full transition-colors ${
        active
          ? 'bg-indigo-600 text-white shadow-sm'
          : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700'
      }`}
      aria-current={active ? 'page' : undefined}
    >
      {label}
    </button>
  );
}


