"use client";

import useSWR from 'swr';
import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Attendee, Expense } from '@/types';
import { calculateTotals } from '@/lib/budget';

const fetcher = (url: string) => fetch(url).then(r => r.json());

type SortField = 'description' | 'amount' | 'date' | 'payer';
type SortDirection = 'asc' | 'desc';

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
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [hasMounted, setHasMounted] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDesc, setEditDesc] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editPayerId, setEditPayerId] = useState<string>('');
  const [editDate, setEditDate] = useState<string>('');
  const [editBeneficiaryIds, setEditBeneficiaryIds] = useState<string[]>([]);

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

  useEffect(() => {
    setHasMounted(true);
  }, []);

  function beginEdit(expense: Expense) {
    setEditingId(expense.id);
    setEditDesc(expense.description);
    setEditAmount(expense.amount.toFixed(2));
    setEditPayerId(expense.payerId);
    const normalized = expense.date ? new Date(expense.date).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
    setEditDate(normalized);
    setEditBeneficiaryIds(expense.beneficiaryIds.slice());
    setEditOpen(true);
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingId) return;
    if (!editDesc.trim() || !editAmount || !editPayerId) return;
    setEditSubmitting(true);
    try {
      await fetch('/api/expenses', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          expenseId: editingId,
          description: editDesc,
          amount: Number(editAmount),
          payerId: editPayerId,
          date: editDate,
        }),
      });
      // Persist beneficiaries separately
      await fetch('/api/expenses', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          expenseId: editingId,
          beneficiaryIds: editBeneficiaryIds,
        }),
      });
      await mutateExpenses();
      setEditOpen(false);
      setEditingId(null);
    } finally {
      setEditSubmitting(false);
    }
  }

  // Sort expenses
  const sortedExpenses = useMemo(() => {
    if (!expenses.length) return [];
    
    return [...expenses].sort((a, b) => {
      let aValue: any;
      let bValue: any;
      
      switch (sortField) {
        case 'date':
          aValue = a.date || '';
          bValue = b.date || '';
          break;
        case 'amount':
          aValue = a.amount;
          bValue = b.amount;
          break;
        case 'description':
          aValue = a.description.toLowerCase();
          bValue = b.description.toLowerCase();
          break;
        case 'payer':
          aValue = attendees.find(att => att.id === a.payerId)?.name || '';
          bValue = attendees.find(att => att.id === b.payerId)?.name || '';
          break;
        default:
          return 0;
      }
      
      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [expenses, sortField, sortDirection, attendees]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

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

      {open && hasMounted && createPortal(
        (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => (!submitting && setOpen(false))} />
            <div role="dialog" aria-modal="true" className="relative z-[1001] w-full max-w-md rounded-xl bg-white/5 backdrop-blur-xl ring-1 ring-white/10 shadow-xl p-5">
              <h4 className="text-base font-semibold">Add expense</h4>
              <form onSubmit={addExpense} className="mt-4 grid grid-cols-1 gap-3">
                                 <div>
                   <label className="block text-xs opacity-70 mb-2">Description</label>
                   <input className="w-full rounded-lg ring-1 ring-white/10 bg-transparent px-3 py-2" placeholder="What was this expense for?" value={desc} onChange={e => setDesc(e.target.value)} />
                 </div>
                                 <div>
                   <label className="block text-xs opacity-70 mb-2">Amount</label>
                   <input
                     className="w-full rounded-lg ring-1 ring-white/10 bg-transparent px-3 py-2"
                     placeholder="$0.00"
                     inputMode="decimal"
                     value={amount}
                     onChange={e => {
                       // Remove all non-numeric characters except decimal point
                       let value = e.target.value.replace(/[^0-9.]/g, '');
                       
                       // Ensure only one decimal point
                       const parts = value.split('.');
                       if (parts.length > 2) {
                         value = parts[0] + '.' + parts.slice(1).join('');
                       }
                       
                       // Limit decimal places to 2
                       if (parts.length === 2 && parts[1].length > 2) {
                         value = parts[0] + '.' + parts[1].slice(0, 2);
                       }
                       
                       // Prevent multiple leading zeros
                       if (value.startsWith('00') && !value.startsWith('0.')) {
                         value = value.slice(1);
                       }
                       
                       setAmount(value);
                     }}
                     onBlur={() => {
                       if (!amount) return;
                       const num = Number(amount);
                       if (!isNaN(num) && num > 0) {
                         setAmount(num.toFixed(2));
                       } else {
                         setAmount('');
                       }
                     }}
                     onKeyDown={(e) => {
                       // Allow: backspace, delete, tab, escape, enter, and navigation keys
                       if ([8, 9, 27, 13, 46, 37, 38, 39, 40].includes(e.keyCode)) {
                         return;
                       }
                       // Allow decimal point
                       if (e.key === '.' && !amount.includes('.')) {
                         return;
                       }
                       // Allow numbers
                       if (/[0-9]/.test(e.key)) {
                         return;
                       }
                       // Prevent all other keys
                       e.preventDefault();
                     }}
                   />
                 </div>
                                 <div>
                   <label className="block text-xs opacity-70 mb-2">Date</label>
                   <input
                     type="date"
                     className="w-full rounded-lg ring-1 ring-white/10 bg-transparent px-3 py-2"
                     value={date}
                     onChange={e => setDate(e.target.value)}
                   />
                 </div>
                <div>
                  <label className="block text-xs opacity-70 mb-2">Who paid for this expense?</label>
                  <select className="w-full rounded-lg ring-1 ring-white/10 bg-white/5 px-3 py-2 text-white" value={payerId} onChange={e => setPayerId(e.target.value)}>
                    <option value="">Select payer...</option>
                    {attendees.map(a => <option key={a.id} value={a.id} className="bg-slate-800 text-white">{a.name}</option>)}
                  </select>
                </div>
                <div className="text-xs opacity-70">This expense applies to these people:</div>
                <div className="flex flex-wrap gap-2 items-center">
                  {attendees.map(a => {
                    const selected = beneficiaryIds.includes(a.id);
                    return (
                                             <button
                         key={a.id}
                         type="button"
                         onClick={() => setBeneficiaryIds(ids => selected ? ids.filter(id => id !== a.id) : [...ids, a.id])}
                         className={`text-sm rounded-full px-3 py-1 ${selected ? 'bg-emerald-400/70 ring-1 ring-emerald-300/70 text-white shadow-md' : 'bg-white/10 ring-1 ring-white/15 hover:bg-white/15'}`}
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
        ),
        document.body
      )}

      {editOpen && hasMounted && createPortal(
        (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => (!editSubmitting && setEditOpen(false))} />
            <div role="dialog" aria-modal="true" className="relative z-[1001] w-full max-w-md rounded-xl bg-white/5 backdrop-blur-xl ring-1 ring-white/10 shadow-xl p-5">
              <h4 className="text-base font-semibold">Edit expense</h4>
              <form onSubmit={saveEdit} className="mt-4 grid grid-cols-1 gap-3">
                <div>
                  <label className="block text-xs opacity-70 mb-2">Description</label>
                  <input className="w-full rounded-lg ring-1 ring-white/10 bg-transparent px-3 py-2" placeholder="What was this expense for?" value={editDesc} onChange={e => setEditDesc(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs opacity-70 mb-2">Amount</label>
                  <input
                    className="w-full rounded-lg ring-1 ring-white/10 bg-transparent px-3 py-2"
                    placeholder="$0.00"
                    inputMode="decimal"
                    value={editAmount}
                    onChange={e => {
                      let value = e.target.value.replace(/[^0-9.]/g, '');
                      const parts = value.split('.');
                      if (parts.length > 2) {
                        value = parts[0] + '.' + parts.slice(1).join('');
                      }
                      if (parts.length === 2 && parts[1].length > 2) {
                        value = parts[0] + '.' + parts[1].slice(0, 2);
                      }
                      if (value.startsWith('00') && !value.startsWith('0.')) {
                        value = value.slice(1);
                      }
                      setEditAmount(value);
                    }}
                    onBlur={() => {
                      if (!editAmount) return;
                      const num = Number(editAmount);
                      if (!isNaN(num) && num > 0) {
                        setEditAmount(num.toFixed(2));
                      } else {
                        setEditAmount('');
                      }
                    }}
                    onKeyDown={(e) => {
                      if ([8, 9, 27, 13, 46, 37, 38, 39, 40].includes((e as unknown as KeyboardEvent).keyCode)) {
                        return;
                      }
                      if (e.key === '.' && !editAmount.includes('.')) {
                        return;
                      }
                      if (/[0-9]/.test(e.key)) {
                        return;
                      }
                      e.preventDefault();
                    }}
                  />
                </div>
                <div>
                  <label className="block text-xs opacity-70 mb-2">Date</label>
                  <input
                    type="date"
                    className="w-full rounded-lg ring-1 ring-white/10 bg-transparent px-3 py-2"
                    value={editDate}
                    onChange={e => setEditDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs opacity-70 mb-2">Who paid for this expense?</label>
                  <select className="w-full rounded-lg ring-1 ring-white/10 bg-white/5 px-3 py-2 text-white" value={editPayerId} onChange={e => setEditPayerId(e.target.value)}>
                    <option value="">Select payer...</option>
                    {attendees.map(a => <option key={a.id} value={a.id} className="bg-slate-800 text-white">{a.name}</option>)}
                  </select>
                </div>
                <div className="text-xs opacity-70">This expense applies to these people:</div>
                <div className="flex flex-wrap gap-2 items-center">
                  {attendees.map(a => {
                    const selected = editBeneficiaryIds.includes(a.id);
                    return (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => setEditBeneficiaryIds(ids => selected ? ids.filter(id => id !== a.id) : [...ids, a.id])}
                        className={`text-sm rounded-full px-3 py-1 ${selected ? 'bg-emerald-400/70 ring-1 ring-emerald-300/70 text-white shadow-md' : 'bg-white/10 ring-1 ring-white/15 hover:bg-white/15'}`}
                      >
                        {a.name}
                      </button>
                    );
                  })}
                </div>
                <div className="flex justify-end gap-2 mt-2">
                  <button type="button" className="rounded-xl ring-1 ring-white/10 bg-white/5 hover:bg-white/10 px-3 py-1.5 text-sm" onClick={() => setEditOpen(false)} disabled={editSubmitting}>Cancel</button>
                  <button type="submit" disabled={editSubmitting} className="rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 text-white font-medium px-3 py-1.5 text-sm">{editSubmitting ? 'Saving…' : 'Save changes'}</button>
                </div>
              </form>
            </div>
          </div>
        ),
        document.body
      )}

      <div className="mt-6">
        {(loadingAttendees || loadingExpenses) && <div className="text-sm opacity-70">Loading…</div>}
        {expenses.length === 0 && <div className="text-sm opacity-70">No expenses yet</div>}
        
        {expenses.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-3 px-2">
                    <button
                      onClick={() => handleSort('date')}
                      className="flex items-center gap-1 hover:opacity-80 transition-opacity"
                    >
                      Date
                      {sortField === 'date' && (
                        <span className="text-xs">
                          {sortDirection === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </button>
                  </th>
                  <th className="text-left py-3 px-2">
                    <button
                      onClick={() => handleSort('amount')}
                      className="flex items-center gap-1 hover:opacity-80 transition-opacity"
                    >
                      Amount
                      {sortField === 'amount' && (
                        <span className="text-xs">
                          {sortDirection === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </button>
                  </th>
                  <th className="text-left py-3 px-2">
                    <button
                      onClick={() => handleSort('description')}
                      className="flex items-center gap-1 hover:opacity-80 transition-opacity"
                    >
                      Description
                      {sortField === 'description' && (
                        <span className="text-xs">
                          {sortDirection === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </button>
                  </th>
                  <th className="text-left py-3 px-2">
                    <button
                      onClick={() => handleSort('payer')}
                      className="flex items-center gap-1 hover:opacity-80 transition-opacity"
                    >
                      Owed
                      {sortField === 'payer' && (
                        <span className="text-xs">
                          {sortDirection === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </button>
                  </th>
                  <th className="text-left py-3 px-2">Reimbursed By</th>
                  <th className="text-left py-3 px-2">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {sortedExpenses.map(e => {
                  const beneficiaries = attendees.filter(a => e.beneficiaryIds.includes(a.id));
                  const payer = attendees.find(a => a.id === e.payerId);
                  
                                     return (
                     <tr key={e.id} className="hover:bg-white/5 transition-colors" onDoubleClick={() => beginEdit(e)}>
                       <td className="py-4 px-2">
                         <div className="text-sm opacity-80">{e.date ? new Date(e.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '-'}</div>
                       </td>
                       <td className="py-4 px-2">
                         <div className="text-xl font-semibold tabular-nums">${e.amount.toFixed(2)}</div>
                       </td>
                       <td className="py-4 px-2">
                         <div className="font-medium break-words max-w-48">{e.description}</div>
                       </td>
                       <td className="py-4 px-2">
                         <div className="inline-flex items-center gap-1 rounded-full bg-white/10 ring-1 ring-white/15 px-2 py-1 text-xs">
                           <span>{payer?.name || 'Unknown'}</span>
                         </div>
                       </td>
                      <td className="py-4 px-2">
                        <div className="flex flex-wrap gap-2">
                          {beneficiaries.map(b => (
                            <div key={b.id} className="inline-flex items-center gap-1 rounded-full bg-white/10 ring-1 ring-white/15 px-2 py-1 text-xs">
                              <span>{b.name}</span>
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="py-4 px-2">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => beginEdit(e)}
                            className="rounded-md ring-1 ring-white/15 text-slate-100 px-2 py-1 text-xs hover:bg-white/10 transition-colors"
                            title="Edit expense"
                            aria-label="Edit expense"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              await fetch(`/api/expenses?id=${encodeURIComponent(e.id)}`, { method: 'DELETE' });
                              mutateExpenses();
                            }}
                            className="rounded-md ring-1 ring-rose-400/40 text-rose-300 px-2 py-1 text-xs hover:bg-rose-500/10 transition-colors"
                            title="Delete expense"
                            aria-label="Delete expense"
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t border-white/10">
                  <td className="py-3 px-2 font-semibold">Total</td>
                  <td className="py-3 px-2 font-semibold tabular-nums">
                    ${sortedExpenses.reduce((sum, e) => sum + e.amount, 0).toFixed(2)}
                  </td>
                  <td colSpan={4}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}


