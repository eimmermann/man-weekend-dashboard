"use client";

import useSWR from 'swr';
import { useMemo, useState } from 'react';
import type { Attendee, Expense } from '@/types';
import { calculateTotals } from '@/lib/budget';

const fetcher = (url: string) => fetch(url).then(r => r.json());

type SortField = 'name' | 'owed' | 'paid' | 'net';

type Row = { id: string; name: string; owed: number; paid: number; net: number };

export default function TotalSpend() {
  const { data: attendees = [] } = useSWR<Attendee[]>('/api/attendees', fetcher);
  const { data: expenses = [] } = useSWR<Expense[]>('/api/expenses', fetcher);
  const totals = calculateTotals(attendees, expenses);

  const [sortField, setSortField] = useState<SortField>('name');
  const [sortAsc, setSortAsc] = useState(true);

  const rows: Row[] = useMemo(() => {
    return attendees.map(a => {
      const owed = totals.perAttendeeOwes.get(a.id) ?? 0;
      const paid = totals.perAttendeePaid.get(a.id) ?? 0;
      const net = totals.perAttendeeNet.get(a.id) ?? 0;
      return { id: a.id, name: a.name, owed, paid, net };
    });
  }, [attendees, totals.perAttendeeOwes, totals.perAttendeePaid, totals.perAttendeeNet]);

  const sorted = useMemo(() => {
    const sortedRows = [...rows];
    sortedRows.sort((a, b) => {
      let av: string | number;
      let bv: string | number;
      switch (sortField) {
        case 'name': av = a.name.toLowerCase(); bv = b.name.toLowerCase(); break;
        case 'owed': av = a.owed; bv = b.owed; break;
        case 'paid': av = a.paid; bv = b.paid; break;
        case 'net': av = a.net; bv = b.net; break;
        default: av = 0; bv = 0; break;
      }
      if (av < bv) return sortAsc ? -1 : 1;
      if (av > bv) return sortAsc ? 1 : -1;
      return 0;
    });
    return sortedRows;
  }, [rows, sortField, sortAsc]);

  const totalOwed = useMemo(() => rows.reduce((s, r) => s + r.owed, 0), [rows]);
  const totalPaid = useMemo(() => rows.reduce((s, r) => s + r.paid, 0), [rows]);
  const totalNet = useMemo(() => rows.reduce((s, r) => s + r.net, 0), [rows]);

  const header = (label: string, field: SortField) => (
    <button
      onClick={() => setSortField(prev => (prev === field ? (setSortAsc(a => !a), prev) : (setSortAsc(true), field))) as unknown as void}
      className="flex items-center gap-1 hover:opacity-80 transition-opacity"
    >
      {label}
      {sortField === field && (
        <span className="text-xs">{sortAsc ? '↑' : '↓'}</span>
      )}
    </button>
  );

  return (
    <div className="rounded-2xl bg-white/5 backdrop-blur-xl ring-1 ring-white/10 p-6 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.5)]">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Total Spend</h3>
        <div className="text-sm opacity-80">All expenses: <span className="font-semibold">${totals.totalSpend.toFixed(2)}</span></div>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/10">
              <th className="text-left py-3 px-2">{header('Name', 'name')}</th>
              <th className="text-left py-3 px-2">{header('Owes', 'owed')}</th>
              <th className="text-left py-3 px-2">{header('Owed', 'paid')}</th>
              <th className="text-left py-3 px-2">{header('Net', 'net')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {sorted.map(r => (
              <tr key={r.id} className="hover:bg-white/5 transition-colors">
                <td className="py-3 px-2">{r.name}</td>
                <td className="py-3 px-2 tabular-nums">${r.owed.toFixed(2)}</td>
                <td className="py-3 px-2 tabular-nums">${r.paid.toFixed(2)}</td>
                <td className={`py-3 px-2 tabular-nums ${r.net >= 0 ? 'text-amber-300' : 'text-emerald-400'}`}>${Math.abs(r.net).toFixed(2)} {r.net >= 0 ? 'owes' : 'owed'}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-white/10">
              <td className="py-3 px-2 font-semibold">Totals</td>
              <td className="py-3 px-2 font-semibold tabular-nums">${totalOwed.toFixed(2)}</td>
              <td className="py-3 px-2 font-semibold tabular-nums">${totalPaid.toFixed(2)}</td>
              <td className="py-3 px-2 font-semibold tabular-nums">${totalNet.toFixed(2)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}


