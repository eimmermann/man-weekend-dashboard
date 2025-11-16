"use client";

import { TRIP_START_ISO, TRIP_END_ISO, AIRBNB_URL, HOUSE_ADDRESS, HERO_IMAGE_URL } from '@/lib/constants';
import { useYear } from '@/context/YearContext';
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
  const { year, currentYearSettings } = useYear();
  
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    setMounted(true);
  }, []);

  // Use per-year settings if available, fall back to constants
  const tripName = `Man Weekend ${year}`;
  const rawAirbnbUrl = currentYearSettings?.airbnbUrl?.trim() || null;
  const airbnbUrl = rawAirbnbUrl || (year === 2025 ? AIRBNB_URL : null);
  const rawAddress = currentYearSettings?.address?.trim() || null;
  const address = rawAddress || (year === 2025 ? HOUSE_ADDRESS : 'Address TBD');
  const hasAddressLink = Boolean(rawAddress || (year === 2025 && HOUSE_ADDRESS));
  const imageUrl = currentYearSettings?.imageUrl?.trim() || (year === 2025 ? HERO_IMAGE_URL : '');
  const heroImageSrc = imageUrl || '/house-hero.jpg';
  
  const start = useMemo(() => {
    if (currentYearSettings?.tripStartDate) {
      const date = new Date(currentYearSettings.tripStartDate + 'T00:00:00');
      // Validate the date
      if (isNaN(date.getTime())) {
        return year === 2025 ? new Date(TRIP_START_ISO) : null;
      }
      return date;
    }
    return year === 2025 ? new Date(TRIP_START_ISO) : null;
  }, [currentYearSettings?.tripStartDate, year]);
  
  const end = useMemo(() => {
    if (currentYearSettings?.tripEndDate) {
      const date = new Date(currentYearSettings.tripEndDate + 'T23:59:59');
      // Validate the date
      if (isNaN(date.getTime())) {
        return year === 2025 ? new Date(TRIP_END_ISO) : null;
      }
      return date;
    }
    return year === 2025 ? new Date(TRIP_END_ISO) : null;
  }, [currentYearSettings?.tripEndDate, year]);
  const secsToStart = start ? Math.max(0, differenceInSeconds(start, now)) : 0;
  // const secsToEnd = Math.max(0, differenceInSeconds(end, now));

  const parts = secondsToParts(secsToStart);
  const startLabel = start ? format(start, 'MMM d, yyyy') : 'TBD';
  const endLabel = end ? format(end, 'MMM d, yyyy') : null;
  const dateLabel = endLabel ? `${startLabel} → ${endLabel}` : startLabel;

  return (
    <div className="w-full rounded-3xl overflow-hidden shadow-[0_10px_30px_-10px_rgba(0,0,0,0.5)] bg-white/5 backdrop-blur-xl ring-1 ring-white/10 relative">
      {/* Hero */}
      <div className="relative h-40 md:h-56 w-full">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-purple-600 to-fuchsia-600 opacity-70" />
        <Image
          src={heroImageSrc}
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
            {tripName}
          </h2>
          {airbnbUrl ? (
            <a
              href={airbnbUrl}
              target="_blank"
              rel="noreferrer"
              className="text-xs md:text-sm bg-white/10 hover:bg-white/20 backdrop-blur rounded-xl ring-1 ring-white/15 px-2.5 py-1 whitespace-nowrap"
            >
              View Airbnb
            </a>
          ) : (
            <span className="text-xs md:text-sm bg-white/10 backdrop-blur rounded-xl ring-1 ring-white/15 px-2.5 py-1 whitespace-nowrap opacity-80">
              Airbnb TBD
            </span>
          )}
        </div>
      </div>
      <div className="px-6 pb-6 pt-4">
        <div className="flex flex-wrap items-center gap-2 text-slate-100">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 ring-1 ring-white/15 px-3 py-1.5 text-xs md:text-sm">
            <span aria-hidden>📅</span>
            {dateLabel}
          </span>
          {hasAddressLink ? (
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-white/10 ring-1 ring-white/15 hover:bg-white/15 px-3 py-1.5 text-xs md:text-sm break-words"
            >
              <span aria-hidden>📍</span>
              {address}
            </a>
          ) : (
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 ring-1 ring-white/15 px-3 py-1.5 text-xs md:text-sm break-words opacity-80">
              <span aria-hidden>📍</span>
              {address}
            </span>
          )}
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
