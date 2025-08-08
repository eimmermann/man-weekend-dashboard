"use client";

import { useState, useEffect, useRef } from 'react';
import useSWR from 'swr';
import type { Attendee } from '@/types';

const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function RandomPicker() {
  const { data: attendees, isLoading } = useSWR<Attendee[]>('/api/attendees', fetcher);
  const [selectedAttendees, setSelectedAttendees] = useState<string[]>([]);
  const [isPicking, setIsPicking] = useState(false);
  const [winner, setWinner] = useState<Attendee | null>(null);
  const [showWinner, setShowWinner] = useState(false);
  const [customName, setCustomName] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customNames, setCustomNames] = useState<{ id: string; name: string }[]>([]);
  const [rotateY, setRotateY] = useState(0);
  const [isRolling, setIsRolling] = useState(false);
  const [wheelFaces, setWheelFaces] = useState<{ id: string; name: string }[]>([]);
  const animationRef = useRef<number | null>(null);

  // Initialize selected attendees when attendees data loads
  useEffect(() => {
    if (attendees && selectedAttendees.length === 0) {
      setSelectedAttendees(attendees.map(a => a.id));
    }
  }, [attendees, selectedAttendees.length]);

  const startPicking = () => {
    if (selectedAttendees.length === 0) return;

    setIsPicking(true);
    setWinner(null);
    setShowWinner(false);
    setIsRolling(true);

    // Build selected names (attendees + custom), cap to 6 faces
    const availableAttendees = attendees?.filter(a => selectedAttendees.includes(a.id)) || [];
    const selectedCustomNames = customNames.filter(c => selectedAttendees.includes(c.id));
    const allNames = [
      ...availableAttendees.map(a => ({ id: a.id, name: a.name, type: 'attendee' as const })),
      ...selectedCustomNames.map(c => ({ id: c.id, name: c.name, type: 'custom' as const }))
    ];

    if (allNames.length === 0) return;

    // Use up to 20 names. Ensure stable face order for both attendees and custom names
    const namesForFaces = allNames.slice(0, 20);
    setWheelFaces(namesForFaces);

    // Randomly choose a winner among the faces-in-use
    const winnerIndex = Math.floor(Math.random() * namesForFaces.length);
    const finalWinner = namesForFaces[winnerIndex];
    // Persist winner at the moment of spin so front-face name matches visual landing
    // Winner is re-set only when animation completes
    // Store directly in local var used for end state

    // For an N-gon prism, winnerIndex corresponds to the face at angle = winnerIndex * segmentAngle
    const segmentAngle = 360 / namesForFaces.length;
    const targetY = -winnerIndex * segmentAngle; // negative to bring that face to the front
    const extraY = (2 + Math.floor(Math.random() * 3)) * 360; // extra spins for flair
    const startY = rotateY;
    // land exactly on the target angle modulo 360 relative to base spins, avoiding rounding drift
    const base = startY + extraY;
    const normalize = (deg: number) => {
      let d = deg % 360;
      if (d < 0) d += 360;
      return d;
    };
    const delta = normalize(targetY - normalize(base));
    const endY = base + delta;

    const startTime = Date.now();
    const duration = 1800;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const currentY = startY + (endY - startY) * easeOut;

      setRotateY(currentY);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setWinner({
          id: finalWinner.id,
          name: finalWinner.name,
          startingAddress: '',
          createdAt: new Date().toISOString(),
        });
        setShowWinner(true);
        setIsPicking(false);
        setIsRolling(false);
      }
    };

    animate();
  };

  const stopPicking = () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    setIsPicking(false);
    setIsRolling(false);
  };

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

  const resetWinner = () => {
    setWinner(null);
    setShowWinner(false);
  };

  const handleSpinAgain = () => {
    // Clear winner display and immediately start a new spin
    setShowWinner(false);
    setWinner(null);
    startPicking();
  };

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-sm bg-white dark:bg-zinc-900">
        <div className="text-center py-8">
          <div className="text-lg font-semibold mb-2">Random Picker</div>
          <div className="text-sm opacity-70">Loading attendees...</div>
        </div>
      </div>
    );
  }

  const availableAttendees = attendees?.filter(a => selectedAttendees.includes(a.id)) || [];
  const selectedCustomNames = customNames.filter(c => selectedAttendees.includes(c.id));
  const allNames = [
    ...availableAttendees.map(a => ({ id: a.id, name: a.name, type: 'attendee' as const })),
    ...selectedCustomNames.map(c => ({ id: c.id, name: c.name, type: 'custom' as const }))
  ];
  const facesToRender = wheelFaces.length > 0 ? wheelFaces : allNames.slice(0, 20);

  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-sm bg-white dark:bg-zinc-900">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold">Random Picker</h3>
        <button
          type="button"
          onClick={() => setShowCustomInput(true)}
          className="text-xs rounded-md bg-green-600 hover:bg-green-500 text-white font-medium px-3 py-1.5"
        >
          Add Custom Name
        </button>
      </div>

      {/* Custom name input */}
      {showCustomInput && (
        <div className="mb-4 p-3 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
          <div className="flex gap-2">
            <input
              type="text"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder="Enter custom name"
              className="flex-1 rounded-md border border-zinc-300 dark:border-zinc-700 bg-transparent px-3 py-1.5 text-sm"
              onKeyDown={(e) => e.key === 'Enter' && addCustomName()}
            />
            <button
              onClick={addCustomName}
              disabled={!customName.trim()}
              className="rounded-md bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white font-medium px-3 py-1.5 text-sm"
            >
              Add
            </button>
            <button
              onClick={() => setShowCustomInput(false)}
              className="rounded-md border border-zinc-300 dark:border-zinc-700 px-3 py-1.5 text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Selection pool and wheel layout */}
          <div className="mb-6 flex flex-col gap-6 md:gap-8 md:flex-row md:items-start">
            {/* Selection pool with pills */}
            <div className="w-full md:w-64 flex flex-col md:h-full">
              <h4 className="text-sm font-medium mb-3">Selection Pool ({allNames.length})</h4>
              <div className="flex flex-wrap gap-2 md:flex-col md:flex-1 md:overflow-y-auto">
                {attendees?.map(attendee => (
                  <button
                    key={attendee.id}
                    onClick={() => toggleAttendee(attendee.id)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all w-fit ${
                      selectedAttendees.includes(attendee.id)
                        ? 'bg-indigo-600 text-white shadow-md'
                        : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                    }`}
                  >
                    {attendee.name}
                  </button>
                ))}
                {selectedCustomNames.map(customName => (
                  <div key={customName.id} className="flex items-center gap-1 w-fit">
                    <span className="px-3 py-1.5 rounded-full text-sm font-medium bg-green-600 text-white shadow-md">
                      {customName.name}
                    </span>
                    <button
                      onClick={() => removeCustomName(customName.id)}
                      className="text-xs text-rose-600 hover:text-rose-500 p-1"
                      title="Remove"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* 3D Wheel Picker */}
            <div className="flex-1 flex flex-col items-center">
              {allNames.length > 0 && (
                <div className="mb-6 w-full flex justify-center">
                  {/* Perspective container */}
                  <div className="w-56 h-56 sm:w-64 sm:h-64 [perspective:1200px]">
                    <div
                      className="relative w-full h-full [transform-style:preserve-3d] transition-transform duration-700 ease-out"
                      style={{ transform: `rotateY(${rotateY}deg)` }}
                    >
                      {/* Build an N-gon cylinder: N faces around Y axis */}
                      {facesToRender.map((f, i) => {
                        const n = facesToRender.length;
                        const faceApothemPx = 80; // distance from center to face plane
                        const faceWidthPx = 2 * faceApothemPx * Math.tan(Math.PI / n);
                        const angle = (360 / n) * i;
                        const bg = i % 2 === 0 ? 'bg-indigo-500 text-white' : 'bg-indigo-300 text-indigo-900';
                        return (
                          <div
                            key={f.id}
                            className={`absolute rounded-xl shadow-xl ${bg} [backface-visibility:hidden] flex items-center justify-center`}
                            style={{
                              width: `${faceWidthPx}px`,
                              height: `${faceWidthPx}px`,
                              top: '50%',
                              left: '50%',
                              transform: `translate(-50%, -50%) rotateY(${angle}deg) translateZ(${faceApothemPx}px)`
                            }}
                          >
                            <div className="text-sm font-bold px-2 text-center truncate" style={{ maxWidth: `${faceWidthPx - 16}px` }}>{f.name}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Spin button */}
              {!showWinner && !isPicking && (
                <button
                  onClick={startPicking}
                  disabled={allNames.length === 0}
                  className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg text-lg"
                >
                  Spin the Wheel!
                </button>
              )}

              {isPicking && (
                <div className="space-y-4">
                  <div className="text-lg font-semibold text-indigo-600">
                    Spinning...
                  </div>
                </div>
              )}

              {showWinner && winner && (
                <div className="space-y-4 text-center flex flex-col items-center">
                  <div className="animate-pulse">
                    <div className="text-sm text-zinc-600 dark:text-zinc-400 mb-2">The winner is...</div>
                    <div className="text-3xl font-extrabold text-green-600">
                      {winner.name}!
                    </div>
                  </div>
                  <button
                    onClick={handleSpinAgain}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg mx-auto"
                  >
                    Spin Again
                  </button>
                </div>
              )}
            </div>
          </div>
    </div>
  );
}
