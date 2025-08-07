"use client";

export type PokemonInfo = { id: number; name: string; flavor_text?: string };

// Seed names; runtime will fill the rest (up to 365) into localStorage cache
export const STATIC_NAMES: Record<number, string> = {
  1: 'bulbasaur', 2: 'ivysaur', 3: 'venusaur', 4: 'charmander', 5: 'charmeleon', 6: 'charizard',
  7: 'squirtle', 8: 'wartortle', 9: 'blastoise', 10: 'caterpie', 11: 'metapod', 12: 'butterfree',
  13: 'weedle', 14: 'kakuna', 15: 'beedrill', 16: 'pidgey', 17: 'pidgeotto', 18: 'pidgeot',
  19: 'rattata', 20: 'raticate', 21: 'spearow', 22: 'fearow', 23: 'ekans', 24: 'arbok', 25: 'pikachu',
  26: 'raichu', 27: 'sandshrew', 28: 'sandslash', 29: 'nidoran-f', 30: 'nidorina', 31: 'nidoqueen',
  32: 'nidoran-m', 33: 'nidorino', 34: 'nidoking', 35: 'clefairy', 36: 'clefable', 37: 'vulpix',
  38: 'ninetales', 39: 'jigglypuff', 40: 'wigglytuff', 41: 'zubat', 42: 'golbat', 43: 'oddish',
  44: 'gloom', 45: 'vileplume', 46: 'paras', 47: 'parasect', 48: 'venonat', 49: 'venomoth', 50: 'diglett',
};

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

export async function ensurePokemonInCache(dexNumber: number): Promise<PokemonInfo | null> {
  if (dexNumber < 1 || dexNumber > 365) return null;
  const cache = readCache();
  if (cache[dexNumber]) return cache[dexNumber];
  const seededName = STATIC_NAMES[dexNumber] || `#${dexNumber}`;
  try {
    const res = await fetch(`https://pokeapi.co/api/v2/pokemon-species/${dexNumber}/`, { cache: 'force-cache' });
    if (!res.ok) throw new Error('http');
    const json: {
      names?: Array<{ language?: { name?: string }; name?: string }>;
      flavor_text_entries?: Array<{ language?: { name?: string }; flavor_text?: string }>;
    } = await res.json();
    const name: string = (json.names?.find(n => n.language?.name === 'en')?.name || seededName).toLowerCase();
    const flavor: string | undefined = json.flavor_text_entries?.find(e => e.language?.name === 'en')?.flavor_text?.replace(/\f/g, ' ');
    const info: PokemonInfo = { id: dexNumber, name, flavor_text: flavor };
    cache[dexNumber] = info;
    writeCache(cache);
    return info;
  } catch {
    const info: PokemonInfo = { id: dexNumber, name: seededName };
    cache[dexNumber] = info;
    writeCache(cache);
    return info;
  }
}

export function getPokemonFromCache(dexNumber: number): PokemonInfo | null {
  const cache = readCache();
  if (cache[dexNumber]) return cache[dexNumber];
  if (STATIC_NAMES[dexNumber]) return { id: dexNumber, name: STATIC_NAMES[dexNumber] };
  return null;
}


