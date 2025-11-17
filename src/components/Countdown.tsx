"use client";

import { TRIP_START_ISO, TRIP_END_ISO, AIRBNB_URL, HOUSE_ADDRESS, HERO_IMAGE_URL } from '@/lib/constants';
import { useYear } from '@/context/YearContext';
import Image from 'next/image';
import { differenceInSeconds, format } from 'date-fns';
import { useEffect, useMemo, useState, type ChangeEventHandler } from 'react';

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
  const { year, setYear, years, currentYearSettings } = useYear();
  
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
  const displayYear = useMemo(() => {
    if (currentYearSettings?.tripStartDate) {
      const parsed = new Date(currentYearSettings.tripStartDate);
      if (!Number.isNaN(parsed.getTime())) {
        return parsed.getFullYear();
      }
    }
    return year;
  }, [currentYearSettings?.tripStartDate, year]);

  const canSelectYear = years.length > 0;
  const handleYearSelect: ChangeEventHandler<HTMLSelectElement> = (event) => {
    const nextYear = Number(event.target.value);
    if (!Number.isNaN(nextYear) && nextYear !== year) {
      setYear(nextYear);
    }
  };

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
        <div className="absolute inset-0 bg-gradient-to-b from-black/15 via-black/40 to-black/70" />
        <div className="absolute inset-x-0 bottom-0 px-4 pb-4">
          <div className="flex flex-col gap-2 text-white">
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs uppercase tracking-[0.4em] text-white/80">
                Man Weekend
              </span>
              {canSelectYear ? (
                <div className="relative inline-flex items-center">
                  <select
                    value={year}
                    onChange={handleYearSelect}
                    className="text-3xl md:text-4xl font-semibold tracking-tight drop-shadow-[0_4px_12px_rgba(0,0,0,0.45)] bg-transparent text-white focus:outline-none appearance-none pr-6"
                  >
                    {years.map((entry) => (
                      <option key={entry.year} value={entry.year} className="text-black text-base">
                        {entry.year}
                      </option>
                    ))}
                  </select>
                  <span className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 text-white/70 text-lg">▾</span>
                </div>
              ) : (
                <span className="text-3xl md:text-4xl font-semibold tracking-tight drop-shadow-[0_4px_12px_rgba(0,0,0,0.45)]">
                  {displayYear}
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs md:text-sm">
              <span className="inline-flex items-center gap-2 rounded-full bg-black/30 px-3 py-1 ring-1 ring-white/20">
                <span aria-hidden>📅</span>
                {dateLabel}
              </span>
              <span className="inline-flex items-center gap-2 rounded-full bg-black/30 px-3 py-1 ring-1 ring-white/20">
                <span aria-hidden>📍</span>
                {address}
              </span>
              {airbnbUrl ? (
                <a
                  href={airbnbUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 ring-1 ring-white/25 text-xs md:text-sm font-semibold hover:bg-white/25"
                >
                  View Airbnb
                </a>
              ) : (
                <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 ring-1 ring-white/20 text-xs md:text-sm opacity-80">
                  Airbnb TBD
                </span>
              )}
              {hasAddressLink && (
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-full border border-white/30 px-3 py-1 text-xs md:text-sm hover:bg-white/10"
                >
                  Open map
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
      <div className="px-6 pb-6 pt-4">
        <div className="text-xs md:text-sm uppercase tracking-[0.5em] text-slate-300">Countdown to kickoff</div>
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
