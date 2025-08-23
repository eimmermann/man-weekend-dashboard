"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { addDays, differenceInCalendarDays, format, isWithinInterval, parseISO, startOfDay } from "date-fns";
import { TRIP_START_ISO, TRIP_END_ISO } from "@/lib/constants";
import useSWR from 'swr';
import type { Attendee } from '@/types';

type Activity = {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  start: string; // HH:mm
  end: string;   // HH:mm
  color?: string; // tailwind class suffix e.g. emerald, indigo
  notes?: string;
  attendeeIds?: string[];
};

const STORAGE_KEY = "mw-schedule-activities";

const DAY_START_HOUR = 7;  // earliest shown hour
const DAY_END_HOUR = 24;   // latest shown hour
const HOUR_PX = 54;        // vertical pixel height per hour

export default function Schedule() {
  const tripStart = useMemo(() => startOfDay(parseISO(TRIP_START_ISO)), []);
  const tripEnd = useMemo(() => startOfDay(parseISO(TRIP_END_ISO)), []);
  const days = useMemo(() => buildDays(tripStart, tripEnd), [tripStart, tripEnd]);

  const [activities, setActivities] = useState<Activity[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(() => format(tripStart, "yyyy-MM-dd"));
  const [start, setStart] = useState("10:00");
  const [end, setEnd] = useState("11:00");
  const [color, setColor] = useState("emerald");
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [notes, setNotes] = useState("");
  const [attendeeIds, setAttendeeIds] = useState<string[]>([]);
  const [drag, setDrag] = useState<null | {
    id: string;
    mode: 'move' | 'resize';
    dateKey: string;
    startMin: number; // preview start in minutes from day start
    endMin: number;   // preview end in minutes from day start
    origStartMin: number;
    origEndMin: number;
    startY: number;
  }>(null);

  // Server persistence via API
  const fetcher = (url: string) => fetch(url).then(r => r.json());
  const { data: serverActivities, mutate } = useSWR<Activity[] | undefined>('/api/schedule', fetcher);
  useEffect(() => { if (Array.isArray(serverActivities)) setActivities(serverActivities); }, [serverActivities]);

  // Attendees for selection
  const { data: attendees } = useSWR<Attendee[] | undefined>('/api/attendees', fetcher);
  const allAttendeeIds = useMemo(() => (attendees ?? []).map(a => a.id), [attendees]);

  const dayToActivities = useMemo(() => {
    const map: Record<string, Array<Activity & { lane: number }>> = {};
    for (const d of days) {
      const key = format(d, "yyyy-MM-dd");
      const sameDay = activities.filter(a => a.date === key);
      map[key] = assignLanes(sameDay);
    }
    return map;
  }, [days, activities]);

  const hours = useMemo(() => Array.from({ length: DAY_END_HOUR - DAY_START_HOUR + 1 }, (_, i) => DAY_START_HOUR + i), []);
  const hourTicks = useMemo(() => hours.slice(0, -1), [hours]);
  const columnHeight = useMemo(() => (DAY_END_HOUR - DAY_START_HOUR) * HOUR_PX, []);
  const colRefs = useRef<Record<string, HTMLDivElement | null>>({});

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    if (!isTripDate(date, tripStart, tripEnd)) return;
    const payload: any = { title: title.trim(), date, start, end, color, notes: notes.trim() || undefined };
    if (attendeeIds && attendeeIds.length > 0) payload.attendeeIds = attendeeIds;
    if (editId) {
      await fetch(`/api/schedule/${encodeURIComponent(editId)}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      mutate();
    } else {
      await fetch('/api/schedule', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      mutate();
    }
    setShowModal(false);
    setTitle("");
    setEditId(null);
    setNotes("");
    setAttendeeIds([]);
  }

  async function removeActivity(id: string) {
    await fetch(`/api/schedule/${encodeURIComponent(id)}`, { method: 'DELETE' });
    mutate();
  }

  function handleColumnClick(e: React.MouseEvent<HTMLDivElement>, dateKey: string) {
    const target = e.target as HTMLElement;
    if (target.closest('.activity-card')) return; // ignore clicks on existing activities
    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
    const y = e.clientY - rect.top; // pixels from top within column
    const minutesFromStart = Math.max(0, Math.min((DAY_END_HOUR - DAY_START_HOUR) * 60, (y / HOUR_PX) * 60));
    // snap to 30-minute increments (floor)
    const snapped = Math.floor(minutesFromStart / 30) * 30;
    const maxStart = (DAY_END_HOUR - DAY_START_HOUR) * 60 - 30;
    const startMin = Math.max(0, Math.min(snapped, maxStart));
    const endMin = Math.min(startMin + 30, (DAY_END_HOUR - DAY_START_HOUR) * 60);
    const startHHMM = minutesToHHmm(startMin + DAY_START_HOUR * 60);
    const endHHMM = minutesToHHmm(endMin + DAY_START_HOUR * 60);
    setDate(dateKey);
    setStart(startHHMM);
    setEnd(endHHMM);
    setTitle("");
    setEditId(null);
    setNotes("");
    setAttendeeIds(allAttendeeIds);
    setShowModal(true);
  }

  function beginDragMove(ev: React.MouseEvent, a: Activity & { lane: number }, dateKey: string) {
    ev.preventDefault();
    const origStartMin = minutesFromDayStart(a.start);
    const origEndMin = minutesFromDayStart(a.end);
    const startY = ev.clientY;
    const payload = {
      id: a.id,
      mode: 'move' as const,
      dateKey,
      startMin: origStartMin,
      endMin: origEndMin,
      origStartMin,
      origEndMin,
      startY,
    };
    setDrag(payload);
    attachDragListeners();
  }

  function beginDragResize(ev: React.MouseEvent, a: Activity & { lane: number }, dateKey: string) {
    ev.preventDefault();
    ev.stopPropagation();
    const origStartMin = minutesFromDayStart(a.start);
    const origEndMin = minutesFromDayStart(a.end);
    const startY = ev.clientY;
    const payload = {
      id: a.id,
      mode: 'resize' as const,
      dateKey,
      startMin: origStartMin,
      endMin: origEndMin,
      origStartMin,
      origEndMin,
      startY,
    };
    setDrag(payload);
    attachDragListeners();
  }

  function attachDragListeners() {
    window.addEventListener('mousemove', onDragMove);
    window.addEventListener('mouseup', onDragEnd);
    document.body.style.cursor = 'grabbing';
  }

  function detachDragListeners() {
    window.removeEventListener('mousemove', onDragMove);
    window.removeEventListener('mouseup', onDragEnd);
    document.body.style.cursor = '';
  }

  function onDragMove(ev: MouseEvent) {
    setDrag(curr => {
      if (!curr) return curr;
      if (curr.mode === 'move') {
        const hover = findHoveredColumn(ev.clientX, ev.clientY);
        const duration = curr.origEndMin - curr.origStartMin;
        if (hover) {
          const { key, rect } = hover;
          const yRel = ev.clientY - rect.top;
          const minutesRaw = (yRel / HOUR_PX) * 60;
          const snapped = Math.round(minutesRaw / 30) * 30;
          const newStart = clamp(0, (DAY_END_HOUR - DAY_START_HOUR) * 60 - duration, snapped);
          const newEnd = newStart + duration;
          return { ...curr, dateKey: key, startMin: newStart, endMin: newEnd };
        } else {
          // fallback: same column relative movement
          const deltaY = ev.clientY - curr.startY;
          const deltaMinutesRaw = (deltaY / HOUR_PX) * 60;
          const deltaMinutes = Math.round(deltaMinutesRaw / 30) * 30;
          const newStart = clamp(0, (DAY_END_HOUR - DAY_START_HOUR) * 60 - duration, curr.origStartMin + deltaMinutes);
          const newEnd = newStart + duration;
          return { ...curr, startMin: newStart, endMin: newEnd };
        }
      } else {
        const deltaY = ev.clientY - curr.startY;
        const deltaMinutesRaw = (deltaY / HOUR_PX) * 60;
        const deltaMinutes = Math.round(deltaMinutesRaw / 30) * 30;
        const minEnd = curr.origStartMin + 30;
        const newEnd = clamp(minEnd, (DAY_END_HOUR - DAY_START_HOUR) * 60, curr.origEndMin + deltaMinutes);
        return { ...curr, endMin: newEnd };
      }
    });
  }

  function onDragEnd() {
    setDrag(curr => {
      if (!curr) return curr;
      // persist into DB
      const newStartAbs = DAY_START_HOUR * 60 + curr.startMin;
      const newEndAbs = DAY_START_HOUR * 60 + curr.endMin;
      const body = { date: curr.dateKey, start: minutesToHHmm(newStartAbs), end: minutesToHHmm(newEndAbs) };
      fetch(`/api/schedule/${encodeURIComponent(curr.id)}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(() => mutate());
      return null;
    });
    detachDragListeners();
  }

  function findHoveredColumn(clientX: number, clientY: number): { key: string; rect: DOMRect } | null {
    const entries = Object.entries(colRefs.current);
    for (const [key, el] of entries) {
      if (!el) continue;
      const rect = el.getBoundingClientRect();
      if (clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom) {
        return { key, rect };
      }
    }
    return null;
  }

  return (
    <div className="rounded-2xl bg-white/5 backdrop-blur-xl ring-1 ring-white/10 p-4 md:p-5 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.5)]">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="text-lg font-semibold">Schedule</div>
        <button onClick={() => { setEditId(null); setShowModal(true); setNotes(""); setAttendeeIds(allAttendeeIds); }} className="rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 hover:opacity-95 text-white font-medium px-3 py-1.5 text-sm">Add Activity</button>
      </div>

      <div className="overflow-x-auto no-scrollbar">
        <div className="min-w-[720px]">
          {/* Header row with day labels aligned to columns */}
          <div className="flex items-end gap-3 mb-1">
            <div className="w-16 shrink-0" />
            <div className="flex gap-3 flex-1">
              {days.map((d) => (
                <div key={format(d, "yyyy-MM-dd")} className="flex-1 min-w-[180px] text-sm font-medium">
                  {format(d, "EEE, MMM d")}
                </div>
              ))}
            </div>
          </div>

          {/* Grid row: time gutter + day columns share the same top origin */}
          <div className="flex gap-3">
            {/* time gutter */}
            <div className="w-16 shrink-0">
              <div className="relative" style={{ height: columnHeight }}>
                {hourTicks.map((h, i) => (
                  <div key={h} className="absolute left-0 right-0" style={{ top: i * HOUR_PX }}>
                    <div className="h-px w-full bg-white/10" />
                    <div className="absolute -translate-y-2 text-[10px] opacity-60">{formatHour(h)}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* days grid */}
            <div className="flex gap-3 flex-1">
              {days.map((d) => {
                const key = format(d, "yyyy-MM-dd");
                const items = dayToActivities[key] || [];
                return (
                  <div key={key} className="flex-1 min-w-[180px]">
                    <div ref={el => { colRefs.current[key] = el; }} className="relative rounded-xl ring-1 ring-white/10 bg-white/5" style={{ height: columnHeight }}>
                      {/* hour lines */}
                      {hourTicks.map((h, i) => (
                        <div key={h} className="absolute left-0 right-0 h-px bg-white/10" style={{ top: i * HOUR_PX }} />
                      ))}
                      {/* activities */}
                      {items.map((a) => {
                        const top = minutesFromDayStart(a.start) / 60 * HOUR_PX;
                        const height = Math.max(24, Math.max(0, (minutesFromDayStart(a.end) - minutesFromDayStart(a.start))) / 60 * HOUR_PX);
                        const startMin = minutesFromDayStart(a.start);
                        const endMin = minutesFromDayStart(a.end);
                        const concurrentCount = Math.max(1, items.filter(b => {
                          const bs = minutesFromDayStart(b.start);
                          const be = minutesFromDayStart(b.end);
                          return startMin < be && bs < endMin; // overlap
                        }).length);
                        const laneWidthPctForGroup = 100 / concurrentCount;
                        const leftPct = a.lane * laneWidthPctForGroup;
                        const widthPct = concurrentCount === 1 ? 100 : (laneWidthPctForGroup - 2); // full width when no overlap
                        const colorBg = colorToBg(a.color || "emerald");
                        const colorRing = colorToRing(a.color || "emerald");
                        const compact = height < 34;
                        const isDraggingThis = drag && drag.id === a.id && drag.dateKey === key;
                        const previewTop = isDraggingThis ? (drag.startMin / 60) * HOUR_PX : top;
                        const previewHeight = isDraggingThis ? Math.max(24, ((drag.endMin - drag.startMin) / 60) * HOUR_PX) : height;
                        const numAttendees = (a.attendeeIds && a.attendeeIds.length) ? a.attendeeIds.length : 0;
                        return (
                          <div
                            key={a.id}
                            className={`activity-card absolute rounded-lg ${colorBg} ${colorRing} text-white shadow flex flex-col z-10 cursor-default overflow-hidden`}
                            style={{ top: previewTop, left: `${leftPct}%`, width: `${widthPct}%`, height: previewHeight, opacity: isDraggingThis ? 0.9 : 1 }}
                            title={`${a.title} (${hhmmToAmPm(a.start)}–${hhmmToAmPm(a.end)})`}
                            onDoubleClick={() => setSelectedActivity(a)}
                          >
                            {/* drag handle for moving the event */}
                            <div
                              className="absolute left-0 top-0 bottom-0 w-2 cursor-grab bg-black/15 hover:bg-black/25"
                              title="Drag to move"
                              onMouseDown={(ev) => { if (ev.button !== 0) return; beginDragMove(ev, a, key); }}
                            />
                            <div className={`${compact ? 'px-2 pt-0.5 pb-0 text-[11px]' : 'px-2 pt-1 text-sm'} font-semibold leading-tight truncate`}>{a.title}</div>
                            {!compact && previewHeight >= 38 && (
                              <div className="px-2 pb-1 text-[10px] opacity-80">{hhmmToAmPm(a.start)} – {hhmmToAmPm(a.end)}</div>
                            )}
                            {!compact && previewHeight >= 60 && (a as any).notes && (
                              <div className="px-2 pb-1 text-[10px] opacity-90 truncate">{(a as any).notes}</div>
                            )}
                            <button onClick={(ev) => { ev.stopPropagation(); removeActivity(a.id); }} className="absolute top-0.5 right-1 text-[10px] opacity-80 hover:opacity-100">×</button>
                            {numAttendees > 0 && (
                              <div className="absolute bottom-0.5 right-1 text-[10px] opacity-90 bg-black/25 rounded px-1 leading-4">{numAttendees}</div>
                            )}
                            {/* resize handle */}
                            <div
                              className="absolute left-0 right-0 bottom-0 h-2 cursor-ns-resize"
                              onMouseDown={(ev) => beginDragResize(ev, a, key)}
                              title="Drag to resize"
                            />
                          </div>
                        );
                      })}
                      {/* drag ghost indicator in hovered column */}
                      {drag && drag.dateKey === key && (
                        <div
                          className="absolute left-0 right-0 pointer-events-none rounded-lg bg-cyan-400/15 ring-2 ring-cyan-300/60"
                          style={{ top: (drag.startMin / 60) * HOUR_PX, height: Math.max(24, ((drag.endMin - drag.startMin) / 60) * HOUR_PX) }}
                        />
                      )}
                       {/* double-click (desktop) and long-press (mobile) capture layer for empty slots */}
                       <PressableCapture onActivate={(ev) => handleColumnClick(ev as unknown as React.MouseEvent<HTMLDivElement>, key)} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/80" onClick={() => setShowModal(false)} />
          <div className="modal-dark relative z-10 w-[min(560px,92vw)] rounded-xl bg-zinc-900/95 backdrop-blur-md ring-1 ring-white/20 p-5 shadow-2xl">
            <div className="flex items-center justify-between mb-3">
              <div className="text-lg font-semibold">{editId ? 'Edit Activity' : 'Add Activity'}</div>
              <button onClick={() => setShowModal(false)} className="opacity-70 hover:opacity-100">×</button>
            </div>
            <form onSubmit={onSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-sm mb-1">Title</label>
                <input value={title} onChange={e => setTitle(e.target.value)} className="w-full rounded-lg ring-1 ring-white/10 bg-transparent px-3 py-2" placeholder="Activity title" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm mb-1">Notes</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} className="w-full rounded-lg ring-1 ring-white/10 bg-transparent px-3 py-2" rows={3} placeholder="Optional notes" />
              </div>
              <div>
                <label className="block text-sm mb-1">Date</label>
                <input type="date" value={date} onChange={e => setDate(e.target.value)} min={format(tripStart, "yyyy-MM-dd")} max={format(tripEnd, "yyyy-MM-dd")} className="w-full rounded-lg ring-1 ring-white/10 bg-transparent px-3 py-2 text-slate-100" style={{ colorScheme: 'dark' }} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm mb-1">Start</label>
                  <input type="time" value={start} onChange={e => setStart(e.target.value)} className="w-full rounded-lg ring-1 ring-white/10 bg-transparent px-3 py-2 text-slate-100" style={{ colorScheme: 'dark' }} />
                </div>
                <div>
                  <label className="block text-sm mb-1">End</label>
                  <input type="time" value={end} onChange={e => setEnd(e.target.value)} className="w-full rounded-lg ring-1 ring-white/10 bg-transparent px-3 py-2 text-slate-100" style={{ colorScheme: 'dark' }} />
                </div>
              </div>
              <div>
                <label className="block text-sm mb-1">Color</label>
                <div className="flex gap-2">
                  {(["emerald","indigo","cyan","violet","rose","amber"] as const).map(c => (
                    <button type="button" key={c} onClick={() => setColor(c)} className={`h-8 w-8 rounded-full ring-2 ${color === c ? "ring-white" : "ring-white/20"} ${swatchBg(c)}`} aria-label={c} />
                  ))}
                </div>
              </div>
              <div className="sm:col-span-2">
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm">Attendees</label>
                  <div className="text-[11px] opacity-70">{attendeeIds.length}/{allAttendeeIds.length} selected</div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => setAttendeeIds(allAttendeeIds)} className="text-xs rounded-md px-2 py-1 ring-1 ring-white/10 bg-white/5 hover:bg-white/10">Select all</button>
                  <button type="button" onClick={() => setAttendeeIds([])} className="text-xs rounded-md px-2 py-1 ring-1 ring-white/10 bg-white/5 hover:bg-white/10">Clear</button>
                </div>
                <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-44 overflow-auto pr-1">
                  {(attendees ?? []).map(a => {
                    const checked = attendeeIds.includes(a.id);
                    return (
                      <label key={a.id} className="flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={checked} onChange={e => {
                          if (e.target.checked) setAttendeeIds(ids => Array.from(new Set([...ids, a.id])));
                          else setAttendeeIds(ids => ids.filter(id => id !== a.id));
                        }} />
                        <span className="opacity-90">{a.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
              <div className="sm:col-span-2 flex items-center justify-end gap-2 mt-1">
                <button type="button" onClick={() => setShowModal(false)} className="rounded-xl ring-1 ring-white/10 bg-white/5 hover:bg-white/10 px-3 py-1.5 text-sm">Cancel</button>
                <button type="submit" className="rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 text-white px-3 py-1.5 text-sm">{editId ? 'Save' : 'Add'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedActivity && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/70" onClick={() => setSelectedActivity(null)} />
          <div className="relative z-10 w-[min(520px,92vw)] rounded-xl bg-zinc-900/95 backdrop-blur-md ring-1 ring-white/20 p-5 shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <div className="text-lg font-semibold">Activity Details</div>
              <button onClick={() => setSelectedActivity(null)} className="opacity-70 hover:opacity-100">×</button>
            </div>
            <div className="space-y-2">
              <div>
                <div className="text-xs opacity-70">Title</div>
                <div className="text-sm font-medium">{selectedActivity.title}</div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-xs opacity-70">Date</div>
                  <div className="text-sm">{selectedActivity.date}</div>
                </div>
                <div>
                  <div className="text-xs opacity-70">Time</div>
                  <div className="text-sm">{selectedActivity.start} – {selectedActivity.end}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-xs opacity-70">Color</div>
                <div className={`h-4 w-4 rounded-full ${swatchBg(selectedActivity.color || 'emerald')}`} />
              </div>
              {(selectedActivity as any).notes && (
                <div>
                  <div className="text-xs opacity-70">Notes</div>
                  <div className="text-sm whitespace-pre-wrap opacity-90">{(selectedActivity as any).notes}</div>
                </div>
              )}
              <div>
                <div className="text-xs opacity-70">Attendees {(selectedActivity as any).attendeeIds ? `(${(selectedActivity as any).attendeeIds.length})` : ''}</div>
                <div className="text-sm opacity-90">
                  {(((selectedActivity as any).attendeeIds as string[]) || []).map(id => (attendees || []).find(a => a.id === id)?.name || 'Unknown').join(', ')}
                </div>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                onClick={() => {
                  setEditId(selectedActivity.id);
                  setTitle(selectedActivity.title);
                  setDate(selectedActivity.date);
                  setStart(selectedActivity.start);
                  setEnd(selectedActivity.end);
                  setColor(selectedActivity.color || 'emerald');
                  setNotes((selectedActivity as any).notes || '');
                  setAttendeeIds(((selectedActivity as any).attendeeIds as string[]) || []);
                  setSelectedActivity(null);
                  setShowModal(true);
                }}
                className="rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 text-white px-3 py-1.5 text-sm"
              >
                Edit
              </button>
              <button onClick={() => setSelectedActivity(null)} className="rounded-xl ring-1 ring-white/10 bg-white/5 hover:bg-white/10 px-3 py-1.5 text-sm">Close</button>
              <button onClick={() => { removeActivity(selectedActivity.id); setSelectedActivity(null); }} className="rounded-xl bg-rose-600/80 hover:bg-rose-600 text-white px-3 py-1.5 text-sm">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PressableCapture({ onActivate }: { onActivate: (ev: Event) => void }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const timerRef = useRef<number | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const handleDbl = (e: MouseEvent) => onActivate(e);
    const handleTouchStart = (e: TouchEvent) => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => onActivate(e), 500);
    };
    const handleTouchEnd = () => {
      if (timerRef.current) { window.clearTimeout(timerRef.current); timerRef.current = null; }
    };
    el.addEventListener('dblclick', handleDbl);
    el.addEventListener('touchstart', handleTouchStart, { passive: true });
    el.addEventListener('touchend', handleTouchEnd, { passive: true });
    el.addEventListener('touchcancel', handleTouchEnd, { passive: true });
    return () => {
      el.removeEventListener('dblclick', handleDbl);
      el.removeEventListener('touchstart', handleTouchStart as EventListener);
      el.removeEventListener('touchend', handleTouchEnd as EventListener);
      el.removeEventListener('touchcancel', handleTouchEnd as EventListener);
    };
  }, [onActivate]);
  return <div ref={ref} className="absolute inset-0 z-0" />;
}

function buildDays(start: Date, end: Date): Date[] {
  const num = differenceInCalendarDays(end, start);
  const out: Date[] = [];
  for (let i = 0; i <= num; i++) out.push(addDays(start, i));
  return out;
}

function isTripDate(dateStr: string, start: Date, end: Date): boolean {
  const d = parseISO(dateStr);
  return isWithinInterval(d, { start, end });
}

function minutesFromDayStart(time: string): number {
  const [hh, mm] = time.split(":").map(Number);
  return Math.max(0, (hh - DAY_START_HOUR) * 60 + (mm || 0));
}

function minutesToHHmm(total: number): string {
  const hh = Math.floor(total / 60);
  const mm = total % 60;
  const h2 = String(hh).padStart(2, '0');
  const m2 = String(mm).padStart(2, '0');
  return `${h2}:${m2}`;
}

function hhmmToAmPm(t: string): string {
  const [hStr, mStr] = t.split(":");
  let h = Number(hStr);
  const m = Number(mStr) || 0;
  const ampm = h >= 12 ? 'pm' : 'am';
  h = ((h + 11) % 12) + 1;
  return `${h}:${String(m).padStart(2, '0')}${ampm}`;
}

function formatHour(h: number): string {
  const ampm = h >= 12 ? "pm" : "am";
  const hh = ((h + 11) % 12) + 1;
  return `${hh}${ampm}`;
}

function assignLanes(items: Activity[]): Array<Activity & { lane: number }> {
  // simple lane assignment for overlaps
  const sorted = [...items].sort((a, b) => (a.start < b.start ? -1 : 1));
  const lanes: Array<{ endMin: number }[]> = [];
  const out: Array<Activity & { lane: number }> = [];
  for (const it of sorted) {
    const startMin = minutesFromDayStart(it.start);
    const endMin = minutesFromDayStart(it.end);
    let assignedLane = 0;
    while (true) {
      if (!lanes[assignedLane]) lanes[assignedLane] = [];
      const lane = lanes[assignedLane];
      const conflict = lane.some(e => startMin < e.endMin);
      if (!conflict) {
        lane.push({ endMin });
        out.push({ ...it, lane: assignedLane });
        break;
      }
      assignedLane++;
    }
  }
  return out;
}

function colorToBg(c: string): string {
  switch (c) {
    case "indigo": return "bg-indigo-500/80";
    case "cyan": return "bg-cyan-500/80";
    case "violet": return "bg-violet-500/80";
    case "rose": return "bg-rose-500/80";
    case "amber": return "bg-amber-500/80";
    default: return "bg-emerald-500/80";
  }
}

function colorToRing(c: string): string {
  switch (c) {
    case "indigo": return "ring-1 ring-indigo-300/50";
    case "cyan": return "ring-1 ring-cyan-300/50";
    case "violet": return "ring-1 ring-violet-300/50";
    case "rose": return "ring-1 ring-rose-300/60";
    case "amber": return "ring-1 ring-amber-300/60";
    default: return "ring-1 ring-emerald-300/50";
  }
}

function swatchBg(c: string): string {
  switch (c) {
    case "indigo": return "bg-indigo-500";
    case "cyan": return "bg-cyan-500";
    case "violet": return "bg-violet-500";
    case "rose": return "bg-rose-500";
    case "amber": return "bg-amber-500";
    default: return "bg-emerald-500";
  }
}

function clamp(min: number, max: number, value: number): number {
  return Math.min(max, Math.max(min, value));
}


