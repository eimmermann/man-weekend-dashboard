"use client";

import useSWR from 'swr';
import { useEffect, useMemo, useState } from 'react';
import type { Attendee, Expense } from '@/types';
import { calculateTotals } from '@/lib/budget';

const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function Expenses() {
  const { data: attendees = [], isLoading: loadingAttendees } = useSWR<Attendee[]>('/api/attendees', fetcher);
  const { data: expenses = [], mutate: mutateExpenses, isLoading: loadingExpenses } = useSWR<Expense[]>('/api/expenses', fetcher);

  const [desc, setDesc] = useState('');
  const [amount, setAmount] = useState('');
  const [payerId, setPayerId] = useState<string>('');
  const [beneficiaryIds, setBeneficiaryIds] = useState<string[]>([]);
  const [date, setDate] = useState<string>(() => new Date().toISOString().slice(0,10));
  const [submitting, setSubmitting] = useState(false);
  const [open, setOpen] = useState(false);

  // Initialize defaults when attendees list changes
  useEffect(() => {
    const allIds = attendees.map(a => a.id);
    // Set beneficiaries to everyone if not matching current
    const differs = allIds.length !== beneficiaryIds.length || allIds.some(id => !beneficiaryIds.includes(id));
    if (differs) setBeneficiaryIds(allIds);
    // Set default payer if not chosen
    if (!payerId && attendees.length > 0) setPayerId(attendees[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attendees]);

  async function addExpense(e: React.FormEvent) {
    e.preventDefault();
    if (!desc.trim() || !amount || !payerId) return;
    setSubmitting(true);
    try {
      await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: desc, amount: Number(amount), payerId, beneficiaryIds, date }),
      });
      setDesc('');
      setAmount('');
      setDate(new Date().toISOString().slice(0,10));
      setPayerId(attendees[0]?.id || '');
      setBeneficiaryIds(attendees.map(a => a.id));
      mutateExpenses();
      setOpen(false);
    } finally {
      setSubmitting(false);
    }
  }

  async function togglePaid(expenseId: string, beneficiaryId: string) {
    await fetch('/api/expenses', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ expenseId, beneficiaryId }),
    });
    mutateExpenses();
  }

  useMemo(() => calculateTotals(attendees, expenses), [attendees, expenses]);

  return (
    <div className="rounded-2xl bg-white/5 backdrop-blur-xl ring-1 ring-white/10 p-6 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.5)]">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Expenses</h3>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="text-xs rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 hover:opacity-95 text-white font-medium px-3 py-1.5"
        >
          Add Expense
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-30 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => (!submitting && setOpen(false))} />
          <div className="relative z-40 w-[92%] max-w-md rounded-xl bg-white/5 backdrop-blur-xl ring-1 ring-white/10 shadow-xl p-5">
            <h4 className="text-base font-semibold">Add expense</h4>
            <form onSubmit={addExpense} className="mt-4 grid grid-cols-1 gap-3">
              <input className="rounded-lg ring-1 ring-white/10 bg-transparent px-3 py-2" placeholder="Description" value={desc} onChange={e => setDesc(e.target.value)} />
              <input
                className="rounded-lg ring-1 ring-white/10 bg-transparent px-3 py-2"
                placeholder="$0.00"
                inputMode="decimal"
                value={amount}
                onChange={e => {
                  const v = e.target.value.replace(/[^0-9.]/g, '');
                  const parts = v.split('.');
                  const cleaned = parts.length > 1 ? `${parts[0]}.${parts[1].slice(0,2)}` : parts[0];
                  setAmount(cleaned);
                }}
                onBlur={() => {
                  if (!amount) return;
                  const n = Number(amount);
                  if (!isNaN(n)) setAmount(n.toFixed(2));
                }}
              />
              <input
                type="date"
                className="rounded-lg ring-1 ring-white/10 bg-transparent px-3 py-2"
                value={date}
                onChange={e => setDate(e.target.value)}
              />
              <select className="rounded-lg ring-1 ring-white/10 bg-transparent px-3 py-2" value={payerId} onChange={e => setPayerId(e.target.value)}>
                <option value="">Payer</option>
                {attendees.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
              <div className="text-xs opacity-70">This expense applies to these people:</div>
              <div className="flex flex-wrap gap-2 items-center">
                {attendees.map(a => {
                  const selected = beneficiaryIds.includes(a.id);
                  return (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => setBeneficiaryIds(ids => selected ? ids.filter(id => id !== a.id) : [...ids, a.id])}
                      className={`text-sm rounded-full px-3 py-1 ${selected ? 'bg-gradient-to-r from-indigo-500 to-cyan-500 text-white' : 'ring-1 ring-white/15 hover:bg-white/10'}`}
                    >
                      {a.name}
                    </button>
                  );
                })}
              </div>
              <div className="flex justify-end gap-2 mt-2">
                <button type="button" className="rounded-xl ring-1 ring-white/10 bg-white/5 hover:bg-white/10 px-3 py-1.5 text-sm" onClick={() => setOpen(false)} disabled={submitting}>Cancel</button>
                <button type="submit" disabled={submitting} className="rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 text-white font-medium px-3 py-1.5 text-sm">{submitting ? 'Adding…' : 'Add expense'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="mt-4 space-y-3">
        {(loadingAttendees || loadingExpenses) && <div className="text-sm opacity-70">Loading…</div>}
        {expenses.length === 0 && <div className="text-sm opacity-70">No expenses yet</div>}
        {expenses.map(e => {
          const beneficiaries = attendees.filter(a => e.beneficiaryIds.includes(a.id));
          const share = beneficiaries.length ? e.amount / beneficiaries.length : 0;
          return (
            <div key={e.id} className="rounded-xl ring-1 ring-white/10 bg-white/5 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-medium break-words">{e.description}</div>
                  <div className="mt-1 text-xl font-semibold tabular-nums">${e.amount.toFixed(2)}</div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <div className="flex items-center gap-2 text-sm opacity-80">
                    <div>Payer: {attendees.find(a => a.id === e.payerId)?.name || 'Unknown'}</div>
                    <button
                      type="button"
                      onClick={async () => {
                        await fetch(`/api/expenses?id=${encodeURIComponent(e.id)}`, { method: 'DELETE' });
                        mutateExpenses();
                      }}
                      className="rounded-md ring-1 ring-rose-400/40 text-rose-300 px-2 py-1 text-xs hover:bg-rose-500/10"
                      title="Delete expense"
                      aria-label="Delete expense"
                    >
                      🗑️
                    </button>
                  </div>
                  {e.date && <div className="text-xs opacity-70">{e.date}</div>}
                </div>
              </div>
              <div className="mt-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs opacity-70">Applies to:</div>
                  <button
                    type="button"
                    onClick={async () => {
                      const everyone = attendees.map(a => a.id);
                      await fetch('/api/expenses', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ expenseId: e.id, beneficiaryIds: everyone }) });
                      mutateExpenses();
                    }}
                    className="rounded-full bg-gradient-to-r from-indigo-500 to-cyan-500 text-white h-6 w-6 flex items-center justify-center text-sm"
                    title="Add people"
                    aria-label="Add people"
                  >
                    +
                  </button>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {beneficiaries.map(b => (
                    <div key={b.id} className="text-xs rounded-full px-2 py-1 ring-1 ring-white/10 flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => togglePaid(e.id, b.id)}
                        className={`h-5 w-5 flex items-center justify-center rounded-full ${e.paidByBeneficiary[b.id] ? 'bg-emerald-600 text-white' : 'bg-white/10'}`}
                        title={`Mark ${b.name} ${e.paidByBeneficiary[b.id] ? 'unpaid' : 'paid'} (share $${share.toFixed(2)})`}
                      >
                        {e.paidByBeneficiary[b.id] ? '✓' : ''}
                      </button>
                      <span>{b.name}</span>
                      <button
                        type="button"
                        onClick={async () => {
                          const newIds = e.beneficiaryIds.filter(id => id !== b.id);
                          await fetch('/api/expenses', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ expenseId: e.id, beneficiaryIds: newIds }) });
                          mutateExpenses();
                        }}
                        className="ml-1 rounded-full ring-1 ring-rose-400/40 text-rose-300 h-5 w-5 flex items-center justify-center hover:bg-rose-500/10"
                        aria-label={`Remove ${b.name}`}
                        title={`Remove ${b.name}`}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}


