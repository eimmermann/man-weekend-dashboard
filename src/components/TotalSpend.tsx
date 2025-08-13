"use client";

import useSWR from 'swr';
import type { Attendee, Expense } from '@/types';
import { calculateTotals } from '@/lib/budget';

const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function TotalSpend() {
  const { data: attendees = [] } = useSWR<Attendee[]>('/api/attendees', fetcher);
  const { data: expenses = [] } = useSWR<Expense[]>('/api/expenses', fetcher);
  const totals = calculateTotals(attendees, expenses);
  return (
    <div className="rounded-2xl bg-white/5 backdrop-blur-xl ring-1 ring-white/10 p-6 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.5)]">
      <h3 className="text-lg font-semibold">Total Spend</h3>
      <div className="mt-2 text-2xl font-bold">${totals.totalSpend.toFixed(2)}</div>
      <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2">
        {attendees.map(a => (
          <div key={a.id} className="flex items-center justify-between rounded-lg ring-1 ring-white/10 bg-white/5 px-3 py-2">
            <div className="font-medium">{a.name}</div>
            <div className="text-sm">
              <span className="opacity-70 mr-2">net</span>
              <span className={totals.perAttendeeNet.get(a.id)! > 0 ? 'text-amber-300' : 'text-emerald-400'}>
                ${Math.abs(totals.perAttendeeNet.get(a.id)!).toFixed(2)} {totals.perAttendeeNet.get(a.id)! > 0 ? 'owes' : 'owed'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}


