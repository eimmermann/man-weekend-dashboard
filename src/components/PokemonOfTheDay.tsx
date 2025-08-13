"use client";

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { TRIP_START_ISO } from '@/lib/constants';
import { differenceInCalendarDays } from 'date-fns';
import { ensurePokemonInCache, getPokemonFromCache, PokemonInfo } from '@/lib/pokemon';

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
  const daysRemaining = Math.max(0, differenceInCalendarDays(new Date(TRIP_START_ISO), new Date()));
  const adjusted = Math.max(0, daysRemaining - 1);
  const dex = adjusted === 0 ? 25 : adjusted; // fallback to Pikachu when adjusted is 0
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


