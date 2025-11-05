"use client";

import { useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';
import { createPortal } from 'react-dom';
import type { Attendee, WeekendBlocker } from '@/types';
import { getWeekendAvailability } from '@/lib/weekend-utils';
import { useYear } from '@/context/YearContext';

const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function WeekendSelector() {
  const { year } = useYear();
  const { data: attendees = [] } = useSWR<Attendee[]>(`/api/attendees?year=${year}`, fetcher);
  const { data: blockers = [], mutate, error: blockersError, isLoading: loadingBlockers } = useSWR<WeekendBlocker[]>(`/api/weekend-blockers?year=${year}`, fetcher);
  const [hasMounted, setHasMounted] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createModalInitialDate, setCreateModalInitialDate] = useState<string | null>(null);
  const [editModalOpen, setEditModalOpen] = useState<WeekendBlocker | null>(null);
  const [, setSelectedWeekend] = useState<string | null>(null);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  const availability = useMemo(() => {
    return getWeekendAvailability(blockers, year);
  }, [blockers, year]);

  const attendeeById = useMemo(() => new Map(attendees.map(a => [a.id, a.name] as const)), [attendees]);

  function handleWeekendCardClick(weekendStart: string) {
    const [yearStr, monthStr, dayStr] = weekendStart.split('-');
    const parsedYear = Number(yearStr);
    const parsedMonth = Number(monthStr);
    const parsedDay = Number(dayStr);

    if (Number.isNaN(parsedYear) || Number.isNaN(parsedMonth) || Number.isNaN(parsedDay)) {
      setCreateModalInitialDate(null);
      setCreateModalOpen(true);
      return;
    }

    const weekendStartDate = new Date(parsedYear, parsedMonth - 1, parsedDay);
    if (Number.isNaN(weekendStartDate.getTime())) {
      setCreateModalInitialDate(null);
      setCreateModalOpen(true);
      return;
    }

    const saturdayDate = new Date(weekendStartDate);
    saturdayDate.setDate(saturdayDate.getDate() + 2);

    const formatted = `${saturdayDate.getFullYear()}-${String(saturdayDate.getMonth() + 1).padStart(2, '0')}-${String(saturdayDate.getDate()).padStart(2, '0')}`;
    setCreateModalInitialDate(formatted);
    setCreateModalOpen(true);
  }

  function handleCloseCreateModal() {
    setCreateModalOpen(false);
    setCreateModalInitialDate(null);
  }

  return (
    <div className="rounded-2xl bg-white/5 backdrop-blur-xl ring-1 ring-white/10 p-6 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.5)]">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold">Weekend Date Selection</h3>
        <button
          type="button"
          onClick={() => {
            setCreateModalInitialDate(null);
            setCreateModalOpen(true);
          }}
          className="rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 hover:opacity-95 text-white font-medium px-4 py-2 text-sm"
        >
          Add Blocker
        </button>
      </div>

      {/* Weekends */}
      <div>
        <h4 className="text-base font-semibold mb-3">Weekends</h4>
        {blockersError && (
          <div className="mb-3 p-3 rounded-lg bg-rose-500/10 ring-1 ring-rose-500/20 text-sm text-rose-300">
            Error loading blockers: {blockersError instanceof Error ? blockersError.message : typeof blockersError === 'string' ? blockersError : 'Unknown error'}
          </div>
        )}
        {loadingBlockers && availability.length === 0 && (
          <div className="py-4 text-sm opacity-70">Loading weekends...</div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {availability.map((weekend) => (
            <div
              key={weekend.startDate}
              role="button"
              tabIndex={0}
              className={`p-3 rounded-lg transition-colors ${
                weekend.blockerCount > 0
                  ? 'bg-red-500/10 ring-1 ring-red-500/20 hover:bg-red-500/15'
                  : 'bg-green-500/10 ring-1 ring-green-500/20 hover:bg-green-500/15'
              } cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-400/70`}
              onClick={() => handleWeekendCardClick(weekend.startDate)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleWeekendCardClick(weekend.startDate);
                }
              }}
            >
              <div className="text-sm font-medium mb-2">{weekend.dateRange}</div>
              <div className="text-xs opacity-70 mb-2">Thu-Sun</div>
              {weekend.blockerCount > 0 ? (
                <div className="space-y-1.5">
                  {weekend.blockers.map((blocker) => (
                    <div
                      key={blocker.id}
                      className="p-2 rounded bg-red-500/5 ring-1 ring-red-500/10 hover:bg-red-500/10 transition-colors cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedWeekend(weekend.startDate);
                        setEditModalOpen(blocker);
                      }}
                    >
                      <div className="text-xs font-medium">
                        {attendeeById.get(blocker.attendeeId) || 'Unknown'}
                      </div>
                      <div className="text-xs opacity-70 mt-0.5">{blocker.eventName}</div>
                      {blocker.isRecurring && (
                        <div className="text-xs opacity-60 mt-0.5">🔄 Recurring yearly</div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs opacity-60">No blockers</div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Create Modal */}
      {createModalOpen && hasMounted && createPortal(
        <CreateBlockerModal
          key={createModalInitialDate ?? 'no-date'}
          attendees={attendees}
          initialDate={createModalInitialDate ?? undefined}
          onClose={handleCloseCreateModal}
          onSuccess={async () => {
            console.log('onSuccess called, mutating blockers...');
            await mutate(undefined, { revalidate: true });
            console.log('Mutate completed');
            handleCloseCreateModal();
          }}
        />,
        document.body
      )}

      {/* Edit/Delete Modal */}
      {editModalOpen && hasMounted && createPortal(
        <EditBlockerModal
          blocker={editModalOpen}
          attendees={attendees}
          allBlockersForWeekend={blockers.filter(b => b.weekendStartDate === editModalOpen.weekendStartDate)}
          onClose={() => {
            setEditModalOpen(null);
            setSelectedWeekend(null);
          }}
          onSuccess={async () => {
            console.log('onSuccess called, mutating blockers...');
            await mutate(undefined, { revalidate: true });
            console.log('Mutate completed');
            setEditModalOpen(null);
            setSelectedWeekend(null);
          }}
        />,
        document.body
      )}
    </div>
  );
}

function CreateBlockerModal({ attendees, onClose, onSuccess, initialDate }: { attendees: Attendee[]; onClose: () => void; onSuccess: () => void; initialDate?: string }) {
  const { year } = useYear();
  const [attendeeId, setAttendeeId] = useState('');
  const [eventName, setEventName] = useState('');
  const [selectedDate, setSelectedDate] = useState(initialDate ?? '');
  const [isRecurring, setIsRecurring] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showWeekendChoice, setShowWeekendChoice] = useState(false);
  const [pendingBlockers, setPendingBlockers] = useState<Array<{ weekendStartDate: string; attendeeId: string; eventName: string; isRecurring: boolean }>>([]);

  useEffect(() => {
    if (attendees.length > 0 && !attendeeId) {
      setAttendeeId(attendees[0].id);
    }
  }, [attendees, attendeeId]);

  useEffect(() => {
    setSelectedDate(initialDate ?? '');
    setError(null);
    setShowWeekendChoice(false);
    setPendingBlockers([]);
  }, [initialDate]);


  // Helper function to find the Thursday of a given week (weekend start)
  // For Thu-Sun: finds the Thursday of that weekend
  // For Mon-Wed: finds the previous weekend's Thursday
  function findWeekendStart(date: Date): string {
    // Use local date to avoid timezone issues
    const year = date.getFullYear();
    const month = date.getMonth();
    const day = date.getDate();
    const d = new Date(year, month, day);
    const dayOfWeek = d.getDay();
    // Thursday is day 4
    let daysToAdjust = 0;
    if (dayOfWeek === 0) daysToAdjust = -3; // Sunday -> previous Thursday
    else if (dayOfWeek === 5) daysToAdjust = -1; // Friday -> previous Thursday
    else if (dayOfWeek === 6) daysToAdjust = -2; // Saturday -> previous Thursday
    else if (dayOfWeek === 1) daysToAdjust = -4; // Monday -> previous Thursday (4 days back: Mon->Sun->Sat->Fri->Thu)
    else if (dayOfWeek === 2) daysToAdjust = -5; // Tuesday -> previous Thursday (5 days back)
    else if (dayOfWeek === 3) daysToAdjust = -6; // Wednesday -> previous Thursday (6 days back)
    // Thursday (4) stays as is
    
    if (daysToAdjust !== 0) {
      d.setDate(d.getDate() + daysToAdjust);
    }
    // Format as YYYY-MM-DD using local date
    const yearStr = d.getFullYear();
    const monthStr = String(d.getMonth() + 1).padStart(2, '0');
    const dayStr = String(d.getDate()).padStart(2, '0');
    return `${yearStr}-${monthStr}-${dayStr}`;
  }

  // Helper function to find the next Thursday
  function findNextThursday(date: Date): string {
    // Use local date to avoid timezone issues
    const year = date.getFullYear();
    const month = date.getMonth();
    const day = date.getDate();
    const d = new Date(year, month, day);
    const dayOfWeek = d.getDay();
    let daysUntilThursday = (4 - dayOfWeek + 7) % 7;
    if (daysUntilThursday === 0) daysUntilThursday = 7; // If it's Thursday, get next Thursday
    d.setDate(d.getDate() + daysUntilThursday);
    // Format as YYYY-MM-DD using local date
    const yearStr = d.getFullYear();
    const monthStr = String(d.getMonth() + 1).padStart(2, '0');
    const dayStr = String(d.getDate()).padStart(2, '0');
    return `${yearStr}-${monthStr}-${dayStr}`;
  }

  async function handleDateSelection() {
    if (!selectedDate) return;
    
    // Parse date string as local date to avoid timezone issues
    const [yearStr, monthStr, dayStr] = selectedDate.split('-');
    const date = new Date(parseInt(yearStr, 10), parseInt(monthStr, 10) - 1, parseInt(dayStr, 10));
    const dateYear = date.getFullYear();
    const dayOfWeek = date.getDay();
    
    // Ensure it's in the selected year
    if (dateYear !== year) {
      setError(`Please select a date in ${year}`);
      return;
    }

    // If event falls within a weekend (Thu=4, Fri=5, Sat=6, Sun=0), block only that weekend
    if (dayOfWeek === 4 || dayOfWeek === 5 || dayOfWeek === 6 || dayOfWeek === 0) {
      // Event is within a weekend, automatically block that weekend only
      // The weekend containing this date is the "before" weekend (weekend that starts before/on this date)
      await createEvent('before'); // Block the weekend containing the event
    } else {
      // Event is Mon-Wed, show choice modal for before/after/both
      const previousWeekend = findWeekendStart(date);
      const nextWeekend = findNextThursday(date);
      setPendingBlockers([
        { weekendStartDate: previousWeekend, attendeeId, eventName: eventName.trim(), isRecurring },
        { weekendStartDate: nextWeekend, attendeeId, eventName: eventName.trim(), isRecurring },
      ]);
      setShowWeekendChoice(true);
    }
  }

  async function createEvent(weekendChoice: 'before' | 'after' | 'both') {
    setSubmitting(true);
    setError(null);

    if (!selectedDate) {
      setError('Event date is required');
      setSubmitting(false);
      return;
    }

    try {
      // Create a single event with weekend choice
      const payload = {
        attendeeId,
        eventName: eventName.trim(),
        eventDate: selectedDate,
        weekendChoice,
        isRecurring,
      };
      
      console.log('Creating event with payload:', payload);
      
      const res = await fetch('/api/weekend-blockers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const responseData = await res.json().catch(() => ({}));
      console.log('API response:', { status: res.status, ok: res.ok, data: responseData });

      if (!res.ok) {
        setError(responseData.error || 'Failed to create event');
        setSubmitting(false);
        return;
      }

      console.log('Event created successfully, calling onSuccess');
      await onSuccess();
    } catch {
      setError('Failed to create event');
      setSubmitting(false);
    }
  }

  async function handleWeekendChoice(choice: 'before' | 'after' | 'both') {
    setShowWeekendChoice(false);
    await createEvent(choice);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!attendeeId || !eventName.trim() || !selectedDate) return;
    await handleDateSelection();
  }

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => !submitting && onClose()} />
      <div
        className="relative z-[1001] w-[92%] max-w-md rounded-xl bg-white/5 backdrop-blur-xl ring-1 ring-white/10 shadow-xl p-5 modal-dark"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-lg font-semibold">Add Weekend Blocker</h4>
          <button
            onClick={() => !submitting && onClose()}
            className="text-white/60 hover:text-white/90 text-2xl leading-none p-1 transition-colors"
            aria-label="Close modal"
          >
            ×
          </button>
        </div>

        {error && (
          <div className="mb-4 text-sm text-rose-400">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm mb-2 opacity-80">Attendee</label>
            <select
              className="w-full rounded-lg ring-1 ring-white/10 bg-transparent px-3 py-2 text-white [&>option]:bg-zinc-900 [&>option]:text-white"
              value={attendeeId}
              onChange={(e) => setAttendeeId(e.target.value)}
              required
            >
              {attendees.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm mb-2 opacity-80">Event Name</label>
            <input
              type="text"
              className="w-full rounded-lg ring-1 ring-white/10 bg-transparent px-3 py-2"
              placeholder="e.g., Family Reunion, Work Conference"
              value={eventName}
              onChange={(e) => setEventName(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-sm mb-2 opacity-80">Date</label>
            <input
              type="date"
              className="w-full rounded-lg ring-1 ring-white/10 bg-transparent px-3 py-2 text-white [color-scheme:dark] date-input-white"
              value={selectedDate}
              onChange={(e) => {
                setSelectedDate(e.target.value);
                setError(null);
              }}
              min={`${year}-01-01`}
              max={`${year}-12-31`}
              required
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="recurring"
              checked={isRecurring}
              onChange={(e) => setIsRecurring(e.target.checked)}
              className="rounded"
            />
            <label htmlFor="recurring" className="text-sm opacity-80">
              Recurring (yearly) - Blocks the same weekend every year
            </label>
          </div>

          <div className="flex items-center justify-end gap-2 mt-6">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting || showWeekendChoice}
              className="rounded-xl ring-1 ring-white/10 bg-white/5 hover:bg-white/10 px-4 py-2 text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || showWeekendChoice}
              className="rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 text-white font-medium px-4 py-2 text-sm"
            >
              {submitting ? 'Adding...' : 'Add Blocker'}
            </button>
          </div>
        </form>

        {/* Weekend Choice Modal */}
        {showWeekendChoice && pendingBlockers.length === 2 && (
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm rounded-xl flex items-center justify-center z-10">
            <div className="bg-white/10 backdrop-blur-xl ring-1 ring-white/20 rounded-xl p-5 max-w-sm w-full mx-4">
              <h5 className="text-base font-semibold mb-3">Which weekend(s) should be blocked?</h5>
              <div className="space-y-2 mb-4">
                <div className="text-xs opacity-70 mb-2">
                  Event date: <span className="font-medium">{selectedDate}</span>
                </div>
                <div className="text-xs opacity-70 mb-2">
                  Choose which weekend(s) to block:
                </div>
                {pendingBlockers.map((blocker, idx) => {
                  const date = new Date(blocker.weekendStartDate);
                  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                  const sunday = new Date(date);
                  sunday.setDate(sunday.getDate() + 3);
                  
                  // Handle month spanning weekends
                  let dateRange: string;
                  if (date.getMonth() === sunday.getMonth()) {
                    dateRange = `${monthNames[date.getMonth()]} ${date.getDate()}-${sunday.getDate()}, ${year}`;
                  } else {
                    dateRange = `${monthNames[date.getMonth()]} ${date.getDate()} - ${monthNames[sunday.getMonth()]} ${sunday.getDate()}, ${year}`;
                  }
                  
                  return (
                    <div key={idx} className="p-2 rounded-lg bg-white/5 ring-1 ring-white/10 text-xs">
                      {idx === 0 ? 'Weekend before: ' : 'Weekend after: '}
                      {dateRange}
                    </div>
                  );
                })}
              </div>
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => handleWeekendChoice('before')}
                  disabled={submitting}
                  className="rounded-xl ring-1 ring-white/10 bg-white/5 hover:bg-white/10 px-4 py-2 text-sm text-left"
                >
                  Block Weekend Before Only
                </button>
                <button
                  type="button"
                  onClick={() => handleWeekendChoice('after')}
                  disabled={submitting}
                  className="rounded-xl ring-1 ring-white/10 bg-white/5 hover:bg-white/10 px-4 py-2 text-sm text-left"
                >
                  Block Weekend After Only
                </button>
                <button
                  type="button"
                  onClick={() => handleWeekendChoice('both')}
                  disabled={submitting}
                  className="rounded-xl ring-1 ring-white/10 bg-white/5 hover:bg-white/10 px-4 py-2 text-sm text-left"
                >
                  Block Both Weekends
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowWeekendChoice(false);
                    setPendingBlockers([]);
                  }}
                  disabled={submitting}
                  className="rounded-xl ring-1 ring-white/10 bg-white/5 hover:bg-white/10 px-4 py-2 text-sm mt-2"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function EditBlockerModal({
  blocker,
  attendees,
  allBlockersForWeekend,
  onClose,
  onSuccess,
}: {
  blocker: WeekendBlocker;
  attendees: Attendee[];
  allBlockersForWeekend: WeekendBlocker[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [attendeeId, setAttendeeId] = useState(blocker.attendeeId);
  const [eventName, setEventName] = useState(blocker.eventName);
  const [isRecurring, setIsRecurring] = useState(blocker.isRecurring);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const { year } = useYear();
  const attendeeById = useMemo(() => new Map(attendees.map(a => [a.id, a.name] as const)), [attendees]);
  const weekendDate = new Date(blocker.weekendStartDate);
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const dateRange = `${monthNames[weekendDate.getMonth()]} ${weekendDate.getDate()}-${weekendDate.getDate() + 3}, ${year}`;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!attendeeId || !eventName.trim()) return;

    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/weekend-blockers?id=${encodeURIComponent(blocker.id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attendeeId,
          eventName: eventName.trim(),
          isRecurring,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Failed to update blocker');
        return;
      }

      onSuccess();
    } catch {
      setError('Failed to update blocker');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/weekend-blockers?id=${encodeURIComponent(blocker.id)}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Failed to delete blocker');
        return;
      }

      onSuccess();
    } catch {
      setError('Failed to delete blocker');
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => (!submitting && !deleting && !showDeleteConfirm) && onClose()} />
      <div
        className="relative z-[1001] w-[92%] max-w-md rounded-xl bg-white/5 backdrop-blur-xl ring-1 ring-white/10 shadow-xl p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-lg font-semibold">Edit Weekend Blocker</h4>
          <button
            onClick={() => (!submitting && !deleting && !showDeleteConfirm) && onClose()}
            className="text-white/60 hover:text-white/90 text-2xl leading-none p-1 transition-colors"
            aria-label="Close modal"
          >
            ×
          </button>
        </div>

        {error && (
          <div className="mb-4 text-sm text-rose-400">{error}</div>
        )}

        {showDeleteConfirm ? (
          <div className="space-y-4">
            <div className="text-sm opacity-80">
              Are you sure you want to delete this blocker? This action cannot be undone.
            </div>
            <div className="p-3 rounded-lg bg-white/5 ring-1 ring-white/10">
              <div className="text-sm font-medium">{eventName}</div>
              <div className="text-xs opacity-70 mt-1">{dateRange}</div>
              <div className="text-xs opacity-70 mt-1">
                {attendeeById.get(attendeeId) || 'Unknown attendee'}
                {isRecurring && ' • Recurring yearly'}
              </div>
            </div>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
                className="rounded-xl ring-1 ring-white/10 bg-white/5 hover:bg-white/10 px-4 py-2 text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-medium px-4 py-2 text-sm"
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="mb-4 p-3 rounded-lg bg-white/5 ring-1 ring-white/10">
              <div className="text-sm font-medium">{dateRange}</div>
              <div className="text-xs opacity-70 mt-1">Thu-Sun</div>
            </div>

            {allBlockersForWeekend.length > 1 && (
              <div className="mb-4 p-3 rounded-lg bg-orange-500/10 ring-1 ring-orange-500/20">
                <div className="text-xs opacity-80">
                  This weekend has {allBlockersForWeekend.length} blocker{allBlockersForWeekend.length !== 1 ? 's' : ''}
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm mb-2 opacity-80">Attendee</label>
                <select
                  className="w-full rounded-lg ring-1 ring-white/10 bg-transparent px-3 py-2 text-white [&>option]:bg-zinc-900 [&>option]:text-white"
                  value={attendeeId}
                  onChange={(e) => setAttendeeId(e.target.value)}
                  required
                >
                  {attendees.map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm mb-2 opacity-80">Event Name</label>
                <input
                  type="text"
                  className="w-full rounded-lg ring-1 ring-white/10 bg-transparent px-3 py-2"
                  value={eventName}
                  onChange={(e) => setEventName(e.target.value)}
                  required
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="recurring-edit"
                  checked={isRecurring}
                  onChange={(e) => setIsRecurring(e.target.checked)}
                  className="rounded"
                />
                <label htmlFor="recurring-edit" className="text-sm opacity-80">
                  Recurring (yearly)
                </label>
              </div>

              <div className="flex items-center justify-between mt-6 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={submitting || deleting}
                  className="rounded-xl ring-1 ring-rose-400/40 text-rose-300 hover:bg-rose-500/10 px-4 py-2 text-sm"
                >
                  Delete
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={submitting || deleting}
                    className="rounded-xl ring-1 ring-white/10 bg-white/5 hover:bg-white/10 px-4 py-2 text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || deleting}
                    className="rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 text-white font-medium px-4 py-2 text-sm"
                  >
                    {submitting ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

