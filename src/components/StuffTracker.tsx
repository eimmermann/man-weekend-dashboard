"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import useSWR from 'swr';
import type { Attendee, StuffEntry, StuffItem } from '@/types';

const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function StuffTracker() {
  const { data: attendees = [] } = useSWR<Attendee[]>('/api/attendees', fetcher);
  const { data: entries = [], mutate } = useSWR<StuffEntry[]>('/api/stuff', fetcher);
  const { data: combined = { items: [], categories: [] } as { items: StuffItem[]; categories: string[] } } = useSWR('/api/stuff/items', fetcher);
  const items = (combined?.items || []) as StuffItem[];
  const categories = (combined?.categories || []) as string[];

  const [thing, setThing] = useState('');
  const [qty, setQty] = useState<number>(1);
  const [category, setCategory] = useState<string>('');
  const [who, setWho] = useState<string>('');
  const [open, setOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const [suggestions, setSuggestions] = useState<StuffItem[]>([]);
  const [catSuggestions, setCatSuggestions] = useState<string[]>([]);
  const [catOpen, setCatOpen] = useState(false);
  const catInputRef = useRef<HTMLInputElement | null>(null);
  const abortRef = useRef<number | null>(null);
  const abortCatRef = useRef<number | null>(null);

  useEffect(() => {
    // typeahead from existing items
    window.clearTimeout(abortRef.current ?? undefined);
    abortRef.current = window.setTimeout(() => {
      const q = thing.trim().toLowerCase();
      if (!q) { setSuggestions([]); setOpen(false); return; }
      const filtered = (items || []).filter(i => i.name.includes(q)).slice(0, 8);
      setSuggestions(filtered);
      setOpen(filtered.length > 0);
      setHighlightIndex(-1);
    }, 150);
    return () => { if (abortRef.current) window.clearTimeout(abortRef.current); };
  }, [thing]);

  useEffect(() => {
    // category typeahead from existing categories
    window.clearTimeout(abortCatRef.current ?? undefined);
    abortCatRef.current = window.setTimeout(() => {
      const q = category.trim().toLowerCase();
      const list = !q
        ? categories.slice(0, 8)
        : categories.filter(c => c.toLowerCase().includes(q)).slice(0, 8);
      setCatSuggestions(list);
    }, 150);
    return () => { if (abortCatRef.current) window.clearTimeout(abortCatRef.current); };
  }, [category]);

  useEffect(() => {
    if (!who && attendees.length > 0) setWho(attendees[0].id);
  }, [attendees, who]);

  function toTitleCase(input: string): string {
    return input
      .toLowerCase()
      .replace(/\b([a-z])/g, (m) => m.toUpperCase());
  }

  function chooseSuggestion(name: string) {
    setThing(toTitleCase(name));
    setOpen(false);
  }

  async function addEntry(e: React.FormEvent) {
    e.preventDefault();
    const thingName = thing.trim();
    const cat = category.trim();
    if (!thingName || !who || qty < 1) return;
    await fetch('/api/stuff', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ thingName, quantity: qty, attendeeId: who, category: cat || undefined }),
    });
    setThing('');
    setQty(1);
    setCategory('');
    mutate();
  }

  async function removeEntry(id: string) {
    await fetch(`/api/stuff?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
    mutate();
  }

  const attendeeById = useMemo(() => new Map(attendees.map(a => [a.id, a.name] as const)), [attendees]);

  type SortKey = 'thing' | 'category' | 'quantity' | 'person' | 'date';
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(key === 'date' ? 'desc' : 'asc');
    }
  }

  const sortedEntries = useMemo(() => {
    const arr = [...(entries || [])];
    arr.sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1;
      const av =
        sortKey === 'thing' ? a.itemName :
        sortKey === 'category' ? (a.itemCategory || '') :
        sortKey === 'person' ? (attendeeById.get(a.attendeeId) || a.attendeeName) :
        sortKey === 'quantity' ? a.quantity :
        new Date(a.createdAt).getTime();
      const bv =
        sortKey === 'thing' ? b.itemName :
        sortKey === 'category' ? (b.itemCategory || '') :
        sortKey === 'person' ? (attendeeById.get(b.attendeeId) || b.attendeeName) :
        sortKey === 'quantity' ? b.quantity :
        new Date(b.createdAt).getTime();
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
      const as = String(av).toLowerCase();
      const bs = String(bv).toLowerCase();
      if (as < bs) return -1 * dir;
      if (as > bs) return 1 * dir;
      return 0;
    });
    return arr;
  }, [entries, sortDir, sortKey, attendeeById]);

  function formatDate(iso: string) {
    try {
      const d = new Date(iso);
      return new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'short', day: 'numeric' }).format(d);
    } catch {
      return iso;
    }
  }

  return (
    <div className="rounded-2xl bg-white/5 backdrop-blur-xl ring-1 ring-white/10 p-6 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.5)]">
      <h3 className="text-lg font-semibold">Stuff To Bring</h3>

      <form onSubmit={addEntry} className="mt-4 grid grid-cols-1 lg:grid-cols-4 gap-3 items-start">
        <div className="relative">
          <input
            className="w-full rounded-lg ring-1 ring-white/10 bg-transparent px-3 py-2"
            placeholder="Thing (e.g., paper towels)"
            value={thing}
            onChange={e => setThing(e.target.value)}
            onFocus={() => suggestions.length > 0 && setOpen(true)}
            onKeyDown={e => {
              if (!open) return;
              if (e.key === 'ArrowDown') { e.preventDefault(); setHighlightIndex(i => Math.min(i + 1, suggestions.length - 1)); }
              if (e.key === 'ArrowUp') { e.preventDefault(); setHighlightIndex(i => Math.max(i - 1, 0)); }
              if (e.key === 'Enter' && highlightIndex >= 0) {
                e.preventDefault();
                chooseSuggestion(suggestions[highlightIndex].name);
              }
              if (e.key === 'Escape') setOpen(false);
            }}
          />
          {open && suggestions.length > 0 && (
            <div className="absolute z-20 mt-1 w-full max-h-56 overflow-auto rounded-lg bg-white/5 backdrop-blur-xl ring-1 ring-white/10 shadow-lg">
              {suggestions.map((s, idx) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => chooseSuggestion(s.name)}
                  className={`block w-full text-left px-3 py-2 text-sm hover:bg-white/10 ${idx === highlightIndex ? 'bg-white/10' : ''}`}
                >
                  {toTitleCase(s.name)}
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <label className="sr-only" htmlFor="qty">Quantity</label>
          <input
            id="qty"
            type="number"
            min={1}
            className="w-full rounded-lg ring-1 ring-white/10 bg-transparent px-3 py-2"
            value={qty}
            onChange={e => setQty(Math.max(1, Number(e.target.value) || 1))}
          />
        </div>

        <div className="relative">
          <input
            className="w-full rounded-lg ring-1 ring-white/10 bg-transparent px-3 py-2"
            placeholder="Category (e.g., kitchen, games)"
            value={category}
            onChange={e => setCategory(e.target.value)}
            onFocus={() => { setCatOpen(true); setCatSuggestions((categories || []).slice(0, 8)); }}
            onBlur={() => setTimeout(() => setCatOpen(false), 100)}
            ref={catInputRef}
          />
          {catOpen && catSuggestions.length > 0 && (
            <div className="absolute z-20 mt-1 w-full max-h-56 overflow-auto rounded-lg bg-white/5 backdrop-blur-xl ring-1 ring-white/10 shadow-lg">
              {catSuggestions.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => { setCategory(toTitleCase(c)); setCatOpen(false); }}
                  className={`block w-full text-left px-3 py-2 text-sm hover:bg-white/10`}
                >
                  {toTitleCase(c)}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <select
            className="w-full rounded-lg ring-1 ring-white/10 bg-transparent px-3 py-2"
            value={who}
            onChange={e => setWho(e.target.value)}
          >
            {attendees.map(a => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
          <button type="submit" className="rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 hover:opacity-95 text-white font-medium px-3 py-2 text-sm">Add</button>
        </div>
      </form>

      <div className="mt-5">
        {sortedEntries.length === 0 ? (
          <div className="py-3 text-sm opacity-70">No items yet</div>
        ) : (
			<div className="overflow-x-auto pr-2">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-white/10">
                  <th className="py-2 pr-3">
                    <button type="button" onClick={() => toggleSort('thing')} className="hover:underline">
                      Thing {sortKey === 'thing' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
                    </button>
                  </th>
                  <th className="py-2 px-3">
                    <button type="button" onClick={() => toggleSort('category')} className="hover:underline">
                      Category {sortKey === 'category' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
                    </button>
                  </th>
                  <th className="py-2 px-3">
                    <button type="button" onClick={() => toggleSort('quantity')} className="hover:underline">
                      Quantity {sortKey === 'quantity' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
                    </button>
                  </th>
                  <th className="py-2 px-3">
                    <button type="button" onClick={() => toggleSort('person')} className="hover:underline">
                      Person {sortKey === 'person' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
                    </button>
                  </th>
                  <th className="py-2 pl-3">
                    <button type="button" onClick={() => toggleSort('date')} className="hover:underline">
                      Date Added {sortKey === 'date' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
                    </button>
                  </th>
                  <th className="py-2 pl-3"></th>
                </tr>
              </thead>
              <tbody>
                {sortedEntries.map(e => (
                  <tr key={e.id} className="border-b border-white/10">
                    <td className="py-2 pr-3 font-medium capitalize">{e.itemName}</td>
                    <td className="py-2 px-3">{e.itemCategory ? toTitleCase(e.itemCategory) : <span className="opacity-50">—</span>}</td>
                    <td className="py-2 px-3">{e.quantity}</td>
                    <td className="py-2 px-3">{attendeeById.get(e.attendeeId) || e.attendeeName}</td>
                    <td className="py-2 pl-3 whitespace-nowrap">{formatDate(e.createdAt)}</td>
						<td className="py-2 pl-3 pr-2 text-right">
                      <button type="button" className="rounded-md ring-1 ring-rose-400/40 text-rose-300 px-2 py-1 text-xs hover:bg-rose-500/10" onClick={() => removeEntry(e.id)} title="Remove">🗑️</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}


