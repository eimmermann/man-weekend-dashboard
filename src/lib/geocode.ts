import { APP_USER_AGENT, HOUSE_ADDRESS } from './constants';

export type Coordinates = { lat: number; lng: number };

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org/search';

export async function geocodeAddress(address: string): Promise<Coordinates | null> {
  try {
    const url = new URL(NOMINATIM_BASE);
    url.searchParams.set('q', address);
    url.searchParams.set('format', 'json');
    url.searchParams.set('limit', '1');

    const res = await fetch(url.toString(), {
      headers: {
        'User-Agent': APP_USER_AGENT,
        'Accept-Language': 'en',
      },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const data = (await res.json()) as Array<{ lat: string; lon: string }>;
    if (!data?.length) return null;
    return { lat: Number(data[0].lat), lng: Number(data[0].lon) };
  } catch {
    return null;
  }
}

export async function geocodeHouse(): Promise<Coordinates | null> {
  return geocodeAddress(HOUSE_ADDRESS);
}
