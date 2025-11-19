"use client";

import type { PokemonInfo } from './pokemon-data';
export type { PokemonInfo } from './pokemon-data';
import { STATIC_NAMES, fetchPokemonInfo, SNARKY_DESCRIPTIONS } from './pokemon-data';

const LS_KEY = 'pokemon-cache-v2';

type CacheShape = Record<number, PokemonInfo>;

function readCache(): CacheShape {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? (JSON.parse(raw) as CacheShape) : {};
  } catch {
    return {};
  }
}

function writeCache(cache: CacheShape) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(cache));
  } catch {
    // ignore
  }
}

function applySnark(info: PokemonInfo | null, dexNumber: number, cacheToUpdate?: CacheShape): PokemonInfo | null {
  if (!info) return null;
  if (info.flavor_text) return info;
  const snark = SNARKY_DESCRIPTIONS[dexNumber];
  if (!snark) return info;
  const enriched = { ...info, flavor_text: snark };
  if (cacheToUpdate) {
    cacheToUpdate[dexNumber] = enriched;
    writeCache(cacheToUpdate);
  }
  return enriched;
}

export async function ensurePokemonInCache(dexNumber: number) {
  if (dexNumber < 1 || dexNumber > 500) return null;
  const cache = readCache();
  if (cache[dexNumber]) return applySnark(cache[dexNumber], dexNumber, cache);
  const info = await fetchPokemonInfo(dexNumber);
  if (!info) return null;
  const enriched = applySnark(info, dexNumber) || info;
  cache[dexNumber] = enriched;
  writeCache(cache);
  return enriched;
}

export function getPokemonFromCache(dexNumber: number): PokemonInfo | null {
  const cache = readCache();
  if (cache[dexNumber]) return applySnark(cache[dexNumber], dexNumber, cache);
  if (STATIC_NAMES[dexNumber]) {
    return applySnark({ id: dexNumber, name: STATIC_NAMES[dexNumber] }, dexNumber);
  }
  return null;
}
