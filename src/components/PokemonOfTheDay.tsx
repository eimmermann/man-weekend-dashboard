"use client";

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { TRIP_START_ISO } from '@/lib/constants';
import { differenceInCalendarDays } from 'date-fns';
import { ensurePokemonInCache, getPokemonFromCache, PokemonInfo } from '@/lib/pokemon';
import { useYear } from '@/context/YearContext';

// Info type is provided by lib/pokemon

function usePokemonByDex(dexNumber: number | null) {
  const [poke, setPoke] = useState<PokemonInfo | null>(null);
  useEffect(() => {
    let canceled = false;
    async function run() {
      if (!dexNumber || dexNumber < 1) { setPoke(null); return; }
      const cached = getPokemonFromCache(dexNumber);
      if (cached && !canceled) setPoke(cached);
      const full = await ensurePokemonInCache(dexNumber);
      if (!canceled) setPoke(full);
    }
    run();
    return () => { canceled = true; };
  }, [dexNumber]);
  return poke;
}

export default function PokemonOfTheDay() {
  const { year, currentYearSettings } = useYear();

  const tripStartDate = useMemo(() => {
    if (currentYearSettings?.tripStartDate) {
      const candidate = new Date(`${currentYearSettings.tripStartDate}T00:00:00`);
      if (!Number.isNaN(candidate.getTime())) {
        return candidate;
      }
    }
    if (year === 2025) {
      const fallback = new Date(TRIP_START_ISO);
      if (!Number.isNaN(fallback.getTime())) {
        return fallback;
      }
    }
    return null;
  }, [currentYearSettings?.tripStartDate, year]);

  const daysRemaining = useMemo(() => {
    if (!tripStartDate) return null;
    return Math.max(0, differenceInCalendarDays(tripStartDate, new Date()));
  }, [tripStartDate]);

  const dex = useMemo(() => {
    if (daysRemaining == null) return 25;
    const adjusted = Math.max(0, daysRemaining - 1);
    return adjusted === 0 ? 25 : adjusted;
  }, [daysRemaining]);

  const poke = usePokemonByDex(dex);

  return (
    <div className="rounded-2xl bg-white/5 backdrop-blur-xl ring-1 ring-white/10 p-6 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.5)]">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Pokémon of the Day</h3>
      </div>
      {poke ? (
        <div className="mt-4 flex items-center gap-4">
          <div className="relative h-32 w-32 shrink-0">
            <Image
              src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${poke.id}.png`}
              alt={poke.name}
              fill
              sizes="128px"
              className="object-contain"
            />
          </div>
          <div className="min-w-0">
            <div className="text-xl font-semibold capitalize">#{poke.id} • {poke.name.replace('-', ' ')}</div>
            <p className="mt-2 text-sm opacity-80 line-clamp-4">{poke.flavor_text || 'A mysterious Pokémon appears as we count down to the trip!'}</p>
          </div>
        </div>
      ) : (
        <div className="mt-4 text-sm opacity-70">No Pokémon today. Rest up for the trip!</div>
      )}
    </div>
  );
}

// Flavor text comes from cache (PokeAPI) when available


