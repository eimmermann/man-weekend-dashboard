"use client";

import useSWR from 'swr';
import type { Attendee } from '@/types';

const fetcher = (url: string) => fetch(url).then(r => r.json());

type Transfer = {
  fromAttendeeId: string;
  toAttendeeId: string;
  amount: number;
  paid: boolean;
  recordedAmount: number | null;
  updatedAt: string | null;
};

export default function FinalBill() {
  const { data: attendees = [] } = useSWR<Attendee[]>('/api/attendees', fetcher);
  const { data, mutate } = useSWR<{ transfers: Transfer[] }>(
    '/api/expenses/settlement',
    fetcher,
    { refreshInterval: 15_000 }
  );

  const name = (id: string) => attendees.find(a => a.id === id)?.name || 'Unknown';

  async function togglePaid(t: Transfer) {
    await fetch('/api/expenses/settlement', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fromAttendeeId: t.fromAttendeeId, toAttendeeId: t.toAttendeeId, amount: t.amount }),
    });
    mutate();
  }

  const transfers = data?.transfers ?? [];

  return (
    <div className="rounded-2xl bg-white/5 backdrop-blur-xl ring-1 ring-white/10 p-6 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.5)]">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Final Bill</h3>
        <div className="text-sm opacity-80">Recommended settlements</div>
      </div>

      {transfers.length === 0 ? (
        <div className="mt-4 text-sm opacity-70">All settled — no transfers needed.</div>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left py-3 px-2">From</th>
                <th className="text-left py-3 px-2">To</th>
                <th className="text-left py-3 px-2">Amount</th>
                <th className="text-left py-3 px-2">Status</th>
                <th className="text-left py-3 px-2">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {transfers.map((t) => {
                const paid = t.paid;
                const amountChanged = t.recordedAmount != null && Math.abs((t.recordedAmount ?? 0) - t.amount) > 0.009;
                return (
                  <tr key={`${t.fromAttendeeId}->${t.toAttendeeId}`} className={paid ? 'opacity-60' : ''}>
                    <td className="py-3 px-2">{name(t.fromAttendeeId)}</td>
                    <td className="py-3 px-2">{name(t.toAttendeeId)}</td>
                    <td className="py-3 px-2 tabular-nums">${t.amount.toFixed(2)}</td>
                    <td className="py-3 px-2">
                      {paid ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 ring-1 ring-emerald-400/40 px-2 py-0.5 text-xs text-emerald-300">
                          ✓ Paid
                          {amountChanged && <span className="ml-1 opacity-80">(outdated)</span>}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 ring-1 ring-amber-400/40 px-2 py-0.5 text-xs text-amber-200">
                          Due
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-2">
                      <button
                        type="button"
                        onClick={() => togglePaid(t)}
                        className={`rounded-md px-3 py-1 text-xs ring-1 transition-colors ${paid ? 'ring-white/15 bg-white/10 hover:bg-white/15' : 'ring-emerald-400/40 text-white bg-emerald-500/20 hover:bg-emerald-500/30'}`}
                      >
                        {paid ? 'Mark unpaid' : 'Mark paid'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}


