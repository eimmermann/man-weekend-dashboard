"use client";

import useSWR from 'swr';
import { useEffect, useRef, useState } from 'react';
import type { Attendee } from '@/types';
// Address display helper to clean and split into envelope-style lines
function formatAddressLines(addr: string): string[] {
  if (!addr) return [];
  // USPS style: line 2 is street + unit, line 3 is "City, ST ZIP"
  const zipRegex = /\b\d{5}(?:-\d{4})?\b/;
  const twoLetterState = /\b([A-Z]{2})\b/;
  const stateMap: Record<string, string> = {
    alabama: 'AL', alaska: 'AK', arizona: 'AZ', arkansas: 'AR', california: 'CA', colorado: 'CO', connecticut: 'CT',
    delaware: 'DE', 'district of columbia': 'DC', florida: 'FL', georgia: 'GA', hawaii: 'HI', idaho: 'ID', illinois: 'IL',
    indiana: 'IN', iowa: 'IA', kansas: 'KS', kentucky: 'KY', louisiana: 'LA', maine: 'ME', maryland: 'MD', massachusetts: 'MA',
    michigan: 'MI', minnesota: 'MN', mississippi: 'MS', missouri: 'MO', montana: 'MT', nebraska: 'NE', nevada: 'NV',
    'new hampshire': 'NH', 'new jersey': 'NJ', 'new mexico': 'NM', 'new york': 'NY', 'north carolina': 'NC', 'north dakota': 'ND',
    ohio: 'OH', oklahoma: 'OK', oregon: 'OR', pennsylvania: 'PA', 'rhode island': 'RI', 'south carolina': 'SC', 'south dakota': 'SD',
    tennessee: 'TN', texas: 'TX', utah: 'UT', vermont: 'VT', virginia: 'VA', washington: 'WA', 'west virginia': 'WV',
    wisconsin: 'WI', wyoming: 'WY'
  };

  // Tokenize by commas, remove empty and country/county
  const raw = addr.split(',').map(t => t.trim()).filter(Boolean);
  const tokens = raw.filter(t => !/^(usa|united\s*states|us)$/i.test(t) && !/county$/i.test(t));

  // Locate zip token and its index
  let zip = '';
  let zipIdx = -1;
  tokens.forEach((t, i) => {
    const m = t.match(zipRegex);
    if (m) { zip = m[0]; zipIdx = i; }
  });

  // Determine state: prefer two-letter, otherwise map full name
  let state = '';
  if (zipIdx >= 0) {
    const stateToken = tokens[zipIdx].replace(zipRegex, '').trim() || tokens[zipIdx - 1] || '';
    const tl = stateToken.match(twoLetterState)?.[1];
    if (tl) state = tl.toUpperCase();
    else {
      const mapped = stateMap[stateToken.toLowerCase() as keyof typeof stateMap];
      if (mapped) state = mapped;
    }
  } else {
    // Fallback search for any state-like token
    for (let i = tokens.length - 1; i >= 0; i--) {
      const t = tokens[i];
      const tl = t.match(twoLetterState)?.[1];
      if (tl) { state = tl.toUpperCase(); zipIdx = i; break; }
      const mapped = stateMap[t.toLowerCase() as keyof typeof stateMap];
      if (mapped) { state = mapped; zipIdx = i; break; }
    }
  }

  // City is the token immediately before the state/zip token
  const cityIdx = zipIdx > 0 ? zipIdx - 1 : Math.max(0, tokens.length - 2);
  const city = tokens[cityIdx] || '';

  // Street+unit are tokens before the city token, joined
  const streetTokens = tokens.slice(0, cityIdx).map(t => t.replace(zipRegex, '').trim()).filter(Boolean);
  let streetLine = streetTokens.join(', ').replace(/\s{2,}/g, ' ').trim();

  // Build city/state/zip
  let cityStateZip = [city, [state, zip].filter(Boolean).join(' ')].filter(Boolean).join(', ').trim();

  // Fallbacks: if we somehow didn't extract, try using trailing tokens
  if (!streetLine || !cityStateZip) {
    if (tokens.length >= 2) {
      const tailCity = tokens[tokens.length - 2];
      const tailStateZipRaw = tokens[tokens.length - 1];
      const tailZip = tailStateZipRaw.match(zipRegex)?.[0] || zip;
      const tailState = (tailStateZipRaw.match(twoLetterState)?.[1] || state).toUpperCase();
      const fallbackCityStateZip = [tailCity, [tailState, tailZip].filter(Boolean).join(' ')].filter(Boolean).join(', ');
      if (!cityStateZip) cityStateZip = fallbackCityStateZip;
      if (!streetLine) {
        const before = tokens.slice(0, Math.max(0, tokens.length - 2));
        const s = before.join(', ').replace(/\s{2,}/g, ' ').trim();
        if (s) streetLine = s;
      }
    }
  }

  const lines: string[] = [];
  if (streetLine) lines.push(streetLine);
  if (cityStateZip) lines.push(cityStateZip);
  return lines;
}
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
  const [editOpen, setEditOpen] = useState<null | Attendee>(null);
  const [confirm, setConfirm] = useState<{ id: string; name: string } | null>(null);

  // Type-ahead state
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState<number>(-1);
  const [loadingSuggestions, setLoadingSuggestions] = useState<boolean>(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (address.trim().length < 2) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    const timeout = setTimeout(async () => {
      try {
        abortRef.current?.abort();
        const ac = new AbortController();
        abortRef.current = ac;
        setOpen(true);
        setLoadingSuggestions(true);
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(address)}&limit=10`, { signal: ac.signal });
        if (!res.ok) return;
        const data = (await res.json()) as Suggestion[];
        setSuggestions(data);
        setOpen(true);
        setHighlightIndex(-1);
      } catch {
        // ignore
      } finally {
        setLoadingSuggestions(false);
      }
    }, 75);
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
              <div className="text-xs opacity-70">
                {formatAddressLines(a.startingAddress).map((line, idx) => (
                  <div key={idx}>{line}</div>
                ))}
              </div>
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
                onClick={() => setEditOpen(a)}
                title="Edit attendee"
                className={`rounded-md border px-2 py-1 text-xs hover:bg-amber-50 dark:hover:bg-amber-900/20 border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-300`}
                aria-label={`Edit ${a.name}`}
              >
                ✏️
              </button>
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
                {open && (
                  <div className="absolute z-20 mt-1 w-full max-h-64 overflow-auto rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-lg">
                    {loadingSuggestions && (
                      <div className="px-3 py-2 text-sm opacity-60">Searching…</div>
                    )}
                    {!loadingSuggestions && suggestions.length === 0 && (
                      <div className="px-3 py-2 text-sm opacity-60">No matches</div>
                    )}
                    {!loadingSuggestions && suggestions.map((s, idx) => (
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
              
              <div className="flex justify-end gap-2 mt-2">
                <button type="button" className="rounded-md border border-zinc-300 dark:border-zinc-700 px-3 py-1.5 text-sm" onClick={() => setAddOpen(false)} disabled={submitting}>Cancel</button>
                <button type="submit" disabled={submitting} className="rounded-md bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-3 py-1.5 text-sm">{submitting ? 'Adding…' : 'Join'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {editOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => (!submitting && setEditOpen(null))} />
          <div className="relative z-[1001] w-[92%] max-w-md rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-xl p-5">
            <h4 className="text-base font-semibold">Edit attendee</h4>
            <EditForm attendee={editOpen} onClose={() => setEditOpen(null)} onSaved={() => { mutate(); setEditOpen(null); }} />
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

function EditForm({ attendee, onClose, onSaved }: { attendee: import('@/types').Attendee; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(attendee.name);
  const [address, setAddress] = useState(attendee.startingAddress);
  function normalizeDateInput(date?: string | null): string {
    if (!date) return '';
    const s = String(date);
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    const d = new Date(s);
    if (isNaN(d.getTime())) return '';
    return d.toISOString().slice(0, 10);
  }
  const [arrivalDate, setArrivalDate] = useState<string>(() => normalizeDateInput(attendee.arrivalDate));
  const [departureDate, setDepartureDate] = useState<string>(() => normalizeDateInput(attendee.departureDate));
  const [saving, setSaving] = useState(false);
  const [suggestions, setSuggestions] = useState<{ id: string; label: string; lat: number; lng: number }[]>([]);
  const [open, setOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (address.trim().length < 2) { setSuggestions([]); setOpen(false); return; }
    const t = setTimeout(async () => {
      try {
        abortRef.current?.abort();
        const ac = new AbortController();
        abortRef.current = ac;
        setOpen(true);
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(address)}&limit=10`, { signal: ac.signal });
        if (!res.ok) return;
        const data = (await res.json()) as { id: string; label: string; lat: number; lng: number }[];
        setSuggestions(data);
        setHighlightIndex(-1);
      } catch {}
    }, 100);
    return () => clearTimeout(t);
  }, [address]);

  function chooseSuggestion(s: { id: string; label: string; lat: number; lng: number }) {
    setAddress(s.label);
    setOpen(false);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !address.trim()) return;
    setSaving(true);
    try {
      const body = { name, startingAddress: address, arrivalDate: arrivalDate || undefined, departureDate: departureDate || undefined };
      await fetch(`/api/attendees/${attendee.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-4 grid grid-cols-1 gap-3">
      <input className="rounded-lg border border-zinc-300 dark:border-zinc-700 bg-transparent px-3 py-2" placeholder="Name" value={name} onChange={e => setName(e.target.value)} />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <input type="date" className="rounded-lg border border-zinc-300 dark:border-zinc-700 bg-transparent px-3 py-2" value={arrivalDate} onChange={e => setArrivalDate(e.target.value)} />
        <input type="date" className="rounded-lg border border-zinc-300 dark:border-zinc-700 bg-transparent px-3 py-2" value={departureDate} onChange={e => setDepartureDate(e.target.value)} />
      </div>
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
      
      <div className="flex justify-end gap-2 mt-2">
        <button type="button" className="rounded-md border border-zinc-300 dark:border-zinc-700 px-3 py-1.5 text-sm" onClick={onClose} disabled={saving}>Cancel</button>
        <button type="submit" disabled={saving} className="rounded-md bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-3 py-1.5 text-sm">{saving ? 'Saving…' : 'Save'}</button>
      </div>
    </form>
  );
}