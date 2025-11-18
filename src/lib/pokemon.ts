"use client";

import type { PokemonInfo } from './pokemon-data';
export type { PokemonInfo } from './pokemon-data';
import { STATIC_NAMES, fetchPokemonInfo } from './pokemon-data';

const LS_KEY = 'pokemon-cache-v1';

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

export async function ensurePokemonInCache(dexNumber: number) {
  if (dexNumber < 1 || dexNumber > 365) return null;
  const cache = readCache();
  if (cache[dexNumber]) return cache[dexNumber];
  const info = await fetchPokemonInfo(dexNumber);
  if (!info) return null;
  cache[dexNumber] = info;
  writeCache(cache);
  return info;
}

export function getPokemonFromCache(dexNumber: number): PokemonInfo | null {
  const cache = readCache();
  if (cache[dexNumber]) return cache[dexNumber];
  if (STATIC_NAMES[dexNumber]) return { id: dexNumber, name: STATIC_NAMES[dexNumber] };
  return null;
}
