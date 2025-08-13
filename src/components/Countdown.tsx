"use client";

import { TRIP_START_ISO, TRIP_END_ISO, TRIP_NAME, AIRBNB_URL, HOUSE_ADDRESS } from '@/lib/constants';
import Image from 'next/image';
import { differenceInSeconds, format } from 'date-fns';
import { useEffect, useMemo, useState } from 'react';

function secondsToParts(total: number) {
  const days = Math.floor(total / (24 * 3600));
  total -= days * 24 * 3600;
  const hours = Math.floor(total / 3600);
  total -= hours * 3600;
  const minutes = Math.floor(total / 60);
  const seconds = total - minutes * 60;
  return { days, hours, minutes, seconds };
}

export default function Countdown() {
  const [now, setNow] = useState(() => new Date());
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    setMounted(true);
  }, []);

  const start = useMemo(() => new Date(TRIP_START_ISO), []);
  const end = useMemo(() => new Date(TRIP_END_ISO), []);
  const secsToStart = Math.max(0, differenceInSeconds(start, now));
  // const secsToEnd = Math.max(0, differenceInSeconds(end, now));

  const parts = secondsToParts(secsToStart);

  return (
    <div className="w-full rounded-3xl overflow-hidden shadow-[0_10px_30px_-10px_rgba(0,0,0,0.5)] bg-white/5 backdrop-blur-xl ring-1 ring-white/10 relative">
      {/* Hero */}
      <div className="relative h-40 md:h-56 w-full">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-purple-600 to-fuchsia-600 opacity-70" />
        <Image
          src="/house-hero.jpg"
          alt="Trip hero"
          fill
          priority
          sizes="100vw"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-black/30" />
        <div className="absolute inset-x-0 bottom-0 p-4 flex items-end justify-between text-white gap-3">
          <h2
            className="text-4xl md:text-6xl font-light md:font-normal leading-tight tracking-tight drop-shadow-[0_2px_10px_rgba(0,0,0,0.55)] text-transparent bg-clip-text bg-gradient-to-r from-indigo-100 via-fuchsia-100 to-pink-100"
          >
            {TRIP_NAME}
          </h2>
          <a
            href={AIRBNB_URL}
            target="_blank"
            rel="noreferrer"
            className="text-xs md:text-sm bg-white/10 hover:bg-white/20 backdrop-blur rounded-xl ring-1 ring-white/15 px-2.5 py-1 whitespace-nowrap"
          >
            View Airbnb
          </a>
        </div>
      </div>
      <div className="px-6 pb-6 pt-4">
        <div className="flex flex-wrap items-center gap-2 text-slate-100">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 ring-1 ring-white/15 px-3 py-1.5 text-xs md:text-sm">
            <span aria-hidden>📅</span>
            {format(start, 'MMM d, yyyy')} → {format(end, 'MMM d, yyyy')}
          </span>
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(HOUSE_ADDRESS)}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-full bg-white/10 ring-1 ring-white/15 hover:bg-white/15 px-3 py-1.5 text-xs md:text-sm break-words"
          >
            <span aria-hidden>📍</span>
            {HOUSE_ADDRESS}
          </a>
        </div>
      <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
        {['Days','Hours','Minutes','Seconds'].map((label, idx) => {
          const value = [parts.days, parts.hours, parts.minutes, parts.seconds][idx];
          return (
            <div key={label} className="rounded-xl bg-white/10 ring-1 ring-white/15 backdrop-blur px-3 py-4">
              <div className="text-3xl font-bold tabular-nums" suppressHydrationWarning>{mounted ? value : 0}</div>
              <div className="text-xs uppercase tracking-wide opacity-70">{label}</div>
            </div>
          );
        })}
      </div>
      </div>
    </div>
  );
}
