"use client";

import { useState } from 'react';
import Attendees from '@/components/Attendees';
import Expenses from '@/components/Expenses';
import TotalSpend from '@/components/TotalSpend';
import TripMap from '@/components/TripMap';
import { Suspense } from 'react';
import PokemonOfTheDay from '@/components/PokemonOfTheDay';

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
        </div>
      )}

      {tab === 'weekend' && (
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-sm bg-white dark:bg-zinc-900">
          <h3 className="text-lg font-semibold">Weekend Of</h3>
          <p className="mt-2 text-sm opacity-70">Add schedule, tasks, and logistics here.</p>
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


