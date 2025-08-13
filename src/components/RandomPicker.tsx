"use client";

import { useState, useEffect, useRef } from 'react';
import useSWR from 'swr';
import type { Attendee } from '@/types';

const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function RandomPicker() {
  const { data: attendees, isLoading } = useSWR<Attendee[]>('/api/attendees', fetcher);
  const [selectedAttendees, setSelectedAttendees] = useState<string[]>([]);
  // Winner state removed from UI; highlight-only mode
  const [customName, setCustomName] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customNames, setCustomNames] = useState<{ id: string; name: string }[]>([]);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const animationRef = useRef<number | null>(null);

  // Initialize selected attendees when attendees data loads
  useEffect(() => {
    if (attendees && selectedAttendees.length === 0) {
      setSelectedAttendees(attendees.map(a => a.id));
    }
  }, [attendees, selectedAttendees.length]);

  const startPicking = () => {
    if (selectedAttendees.length === 0) return;

    // highlight-only mode
    setHighlightedId(null);

    // Build selected names (attendees + custom)
    const availableAttendees = attendees?.filter(a => selectedAttendees.includes(a.id)) || [];
    const selectedCustomNames = customNames.filter(c => selectedAttendees.includes(c.id));
    const allNames = [
      ...availableAttendees.map(a => ({ id: a.id, name: a.name, type: 'attendee' as const })),
      ...selectedCustomNames.map(c => ({ id: c.id, name: c.name, type: 'custom' as const }))
    ];

    if (allNames.length === 0) return;
    // Flash different names briefly, then land on a final winner
    const namesForFlash = allNames.slice(0, 50);
    const intervalMs = 80;
    const durationMs = 1600;
    const steps = Math.max(8, Math.floor(durationMs / intervalMs));
    let count = 0;
    if (animationRef.current) window.clearInterval(animationRef.current);
    const id = window.setInterval(() => {
      const pick = namesForFlash[Math.floor(Math.random() * namesForFlash.length)];
      setHighlightedId(pick.id);
      count++;
      if (count >= steps) {
        window.clearInterval(id);
        const final = namesForFlash[Math.floor(Math.random() * namesForFlash.length)];
        setHighlightedId(final.id);
        // final highlight only
      }
    }, intervalMs);
    animationRef.current = id;
  };

  // const stopPicking = () => {
  //   if (animationRef.current) {
  //     window.clearInterval(animationRef.current);
  //   }
  //   setIsPicking(false);
  // };

  const toggleAttendee = (attendeeId: string) => {
    setSelectedAttendees(prev => 
      prev.includes(attendeeId) 
        ? prev.filter(id => id !== attendeeId)
        : [...prev, attendeeId]
    );
  };

  const addCustomName = () => {
    if (customName.trim()) {
      const customId = `custom-${Date.now()}`;
      const newCustomName = { id: customId, name: customName.trim() };
      setCustomNames(prev => [...prev, newCustomName]);
      setSelectedAttendees(prev => [...prev, customId]);
      setCustomName('');
      setShowCustomInput(false);
    }
  };

  const removeCustomName = (customId: string) => {
    setSelectedAttendees(prev => prev.filter(id => id !== customId));
    setCustomNames(prev => prev.filter(c => c.id !== customId));
  };

  // const resetWinner = () => {
  //   setWinner(null);
  //   setShowWinner(false);
  // };

  // const handleSpinAgain = () => {
  //   // Clear winner display and immediately start a new spin
  //   setShowWinner(false);
  //   setWinner(null);
  //   startPicking();
  // };

  if (isLoading) {
    return (
      <div className="rounded-2xl bg-white/5 backdrop-blur-xl ring-1 ring-white/10 p-6 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.5)]">
        <div className="text-center py-8">
          <div className="text-lg font-semibold mb-2">Random Picker</div>
          <div className="text-sm opacity-70">Loading attendees...</div>
        </div>
      </div>
    );
  }

  // Build lists for rendering below
  const availableAttendees = attendees?.filter(a => selectedAttendees.includes(a.id)) || [];
  const selectedCustomNames = customNames.filter(c => selectedAttendees.includes(c.id));
  // no 3D wheel; simple flashing selection

  return (
    <div className="random-picker rounded-2xl bg-white/5 backdrop-blur-xl ring-1 ring-white/10 p-6 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.5)]">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Random Picker</h3>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowCustomInput(true)}
            className="sub-btn"
          >
            Add Custom Name
          </button>
          <button
            type="button"
            onClick={startPicking}
            disabled={(attendees?.length || 0) === 0 || selectedAttendees.length === 0}
            className="rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 hover:opacity-95 text-white font-medium px-3 py-1.5"
          >
            Spin
          </button>
        </div>
      </div>

      {/* Custom name input */}
      {showCustomInput && (
        <div className="mb-4 p-3 rounded-xl bg-white/5 backdrop-blur-lg ring-1 ring-white/10">
          <div className="flex gap-2">
            <input
              type="text"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder="Enter custom name"
              className="flex-1 rounded-md ring-1 ring-white/10 bg-transparent px-3 py-1.5 text-sm text-slate-100 placeholder:text-slate-300/60"
              onKeyDown={(e) => e.key === 'Enter' && addCustomName()}
            />
            <button
              onClick={addCustomName}
              disabled={!customName.trim()}
              className="rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 hover:opacity-95 disabled:opacity-50 text-white font-medium px-3 py-1.5 text-sm"
            >
              Add
            </button>
            <button
              onClick={() => setShowCustomInput(false)}
              className="sub-btn"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Compact selection list */}
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
                {attendees?.map(attendee => (
                  <button
                    key={attendee.id}
                    onClick={() => toggleAttendee(attendee.id)}
                    className={`sub-btn ${highlightedId === attendee.id ? 'is-highlighted' : ''}`}
                    aria-pressed={selectedAttendees.includes(attendee.id)}
                  >
                    {attendee.name}
                  </button>
                ))}
                {selectedCustomNames.map(customName => (
                  <div key={customName.id} className="flex items-center gap-1 w-fit">
                    <span className={`sub-btn ${selectedAttendees.includes(customName.id) ? 'sub-btn-selected' : ''} ${highlightedId === customName.id ? 'is-highlighted' : ''}`}> 
                      {customName.name}
                    </span>
                    <button
                      onClick={() => removeCustomName(customName.id)}
                      className="text-xs text-rose-300 hover:text-rose-200 p-1"
                      title="Remove"
                    >
                      ×
                    </button>
                  </div>
                ))}
            </div>

            {/* controls moved to header */}
          </div>
    </div>
  );
}
