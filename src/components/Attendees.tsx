"use client";

import useSWR from 'swr';
import { useEffect, useRef, useState } from 'react';
import type { Attendee } from '@/types';
import { formatAddress } from '@/lib/formatAddress';
import { DEFAULT_ARRIVAL_DATE, DEFAULT_DEPARTURE_DATE } from '@/lib/constants';

const fetcher = (url: string) => fetch(url).then(r => r.json());

type Suggestion = { id: string; label: string; lat: number; lng: number };

export default function Attendees() {
  const { data: attendees, mutate, isLoading } = useSWR<Attendee[]>('/api/attendees', fetcher);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [arrivalDate, setArrivalDate] = useState<string>(DEFAULT_ARRIVAL_DATE);
  const [departureDate, setDepartureDate] = useState<string>(DEFAULT_DEPARTURE_DATE);
  const [addOpen, setAddOpen] = useState(false);
  const [confirm, setConfirm] = useState<{ id: string; name: string } | null>(null);

  // Type-ahead state
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState<number>(-1);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (address.trim().length < 3) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    const timeout = setTimeout(async () => {
      try {
        abortRef.current?.abort();
        const ac = new AbortController();
        abortRef.current = ac;
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(address)}&limit=6`, { signal: ac.signal });
        if (!res.ok) return;
        const data = (await res.json()) as Suggestion[];
        // Ensure suggestions use the same formatted style as display
        const formatted = data.map(s => ({ ...s, label: formatAddress(s.label) || s.label }));
        setSuggestions(formatted);
        setOpen(true);
        setHighlightIndex(-1);
      } catch {
        // ignore
      }
    }, 150);
    return () => clearTimeout(timeout);
  }, [address]);

  function chooseSuggestion(s: Suggestion) {
    setAddress(s.label);
    setOpen(false);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !address.trim()) return;
    setSubmitting(true);
    try {
      await fetch('/api/attendees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, startingAddress: address, arrivalDate: arrivalDate || undefined, departureDate: departureDate || undefined }),
      });
      setName('');
      setAddress('');
      setArrivalDate(DEFAULT_ARRIVAL_DATE);
      setDepartureDate(DEFAULT_DEPARTURE_DATE);
      setSuggestions([]);
      setOpen(false);
      mutate();
      setAddOpen(false);
    } finally {
      setSubmitting(false);
    }
  }

  async function onDelete(id: string) {
    if (!id) return;
    setError(null);
    setDeletingId(id);
    try {
      const res = await fetch(`/api/attendees/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        if (res.status === 409) setError('Cannot remove attendee: they are referenced by expenses.');
        else if (res.status === 404) setError('Attendee not found.');
        else setError('Failed to remove attendee.');
        return;
      }
      await mutate();
    } catch {
      setError('Failed to remove attendee.');
    } finally {
      setDeletingId(null);
      setConfirm(null);
    }
  }

  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-sm bg-white dark:bg-zinc-900">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Attendees</h3>
        <button
          type="button"
          onClick={() => setAddOpen(true)}
          className="text-xs rounded-md bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-3 py-1.5"
        >
          Join Man Weekend
        </button>
      </div>

      {error && (
        <div className="mt-3 text-sm text-rose-600 dark:text-rose-400">{error}</div>
      )}
      <div className="mt-4 divide-y divide-zinc-200 dark:divide-zinc-800">
        {isLoading && <div className="py-3 text-sm opacity-70">Loading…</div>}
        {attendees?.length ? attendees.map(a => (
          <div key={a.id} className="py-3 flex items-center justify-between">
            <div>
              <div className="font-medium">{a.name}</div>
              <div className="text-xs opacity-70">{formatAddress(a.startingAddress)}</div>
              {(a.arrivalDate || a.departureDate) && (
                <div className="mt-1 text-[11px] opacity-70">
                  {a.arrivalDate ? `Arrives ${(a.arrivalDate || '').slice(0,10)}` : ''}
                  {a.arrivalDate && a.departureDate ? ' • ' : ''}
                  {a.departureDate ? `Departs ${(a.departureDate || '').slice(0,10)}` : ''}
                </div>
              )}
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setConfirm({ id: a.id, name: a.name })}
                disabled={deletingId === a.id}
                title="Remove attendee"
                className={`rounded-md border px-2 py-1 text-xs transition-colors ${deletingId === a.id ? 'opacity-50 cursor-not-allowed' : 'hover:bg-rose-50 dark:hover:bg-rose-900/20'} border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300`}
                aria-label={`Remove ${a.name}`}
              >
                🗑️
              </button>
            </div>
          </div>
        )) : <div className="py-3 text-sm opacity-70">No attendees yet</div>}
      </div>
      {addOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => (!submitting && setAddOpen(false))} />
          <div className="relative z-[1001] w-[92%] max-w-md rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-xl p-5">
            <h4 className="text-base font-semibold">Join Man Weekend</h4>
            <form onSubmit={onSubmit} className="mt-4 grid grid-cols-1 gap-3">
              <input
                className="rounded-lg border border-zinc-300 dark:border-zinc-700 bg-transparent px-3 py-2"
                placeholder="Your name"
                value={name}
                onChange={e => setName(e.target.value)}
              />
              <div className="relative">
                <input
                  className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-transparent px-3 py-2"
                  placeholder="Starting address"
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  onFocus={() => suggestions.length > 0 && setOpen(true)}
                  onKeyDown={e => {
                    if (!open) return;
                    if (e.key === 'ArrowDown') { e.preventDefault(); setHighlightIndex(i => Math.min(i + 1, suggestions.length - 1)); }
                    if (e.key === 'ArrowUp') { e.preventDefault(); setHighlightIndex(i => Math.max(i - 1, 0)); }
                    if (e.key === 'Enter' && highlightIndex >= 0 && highlightIndex < suggestions.length) {
                      e.preventDefault();
                      chooseSuggestion(suggestions[highlightIndex]);
                    }
                    if (e.key === 'Escape') setOpen(false);
                  }}
                />
                {open && suggestions.length > 0 && (
                  <div className="absolute z-20 mt-1 w-full max-h-64 overflow-auto rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-lg">
                    {suggestions.map((s, idx) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => chooseSuggestion(s)}
                    className={`block w-full text-left px-3 py-2 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800 ${idx === highlightIndex ? 'bg-zinc-50 dark:bg-zinc-800' : ''}`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="date"
                  className="rounded-lg border border-zinc-300 dark:border-zinc-700 bg-transparent px-3 py-2"
                  placeholder="Arrival date"
                  value={arrivalDate}
                  onChange={e => setArrivalDate(e.target.value)}
                />
                <input
                  type="date"
                  className="rounded-lg border border-zinc-300 dark:border-zinc-700 bg-transparent px-3 py-2"
                  placeholder="Departure date"
                  value={departureDate}
                  onChange={e => setDepartureDate(e.target.value)}
                />
              </div>
              <div className="flex justify-end gap-2 mt-2">
                <button type="button" className="rounded-md border border-zinc-300 dark:border-zinc-700 px-3 py-1.5 text-sm" onClick={() => setAddOpen(false)} disabled={submitting}>Cancel</button>
                <button type="submit" disabled={submitting} className="rounded-md bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-3 py-1.5 text-sm">{submitting ? 'Adding…' : 'Join'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {confirm && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => (deletingId ? null : setConfirm(null))}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="remove-attendee-title"
            className="relative z-[1001] w-[92%] max-w-sm rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-xl p-5"
          >
            <h4 id="remove-attendee-title" className="text-base font-semibold">Remove attendee?</h4>
            <p className="mt-2 text-sm opacity-80">Are you sure you want to remove <span className="font-medium">{confirm.name}</span>? This action cannot be undone.</p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                className="rounded-md border border-zinc-300 dark:border-zinc-700 px-3 py-1.5 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800"
                onClick={() => setConfirm(null)}
                disabled={!!deletingId}
              >
                Cancel
              </button>
              <button
                type="button"
                className={`rounded-md px-3 py-1.5 text-sm text-white ${deletingId ? 'bg-rose-500 opacity-70 cursor-not-allowed' : 'bg-rose-600 hover:bg-rose-500'}`}
                onClick={() => onDelete(confirm.id)}
                disabled={!!deletingId}
              >
                {deletingId ? 'Removing…' : 'Remove'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
