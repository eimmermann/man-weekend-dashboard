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
  // On the client, route through our Next.js API to avoid CORS/rate limits
  if (typeof window !== 'undefined') {
    try {
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(HOUSE_ADDRESS)}&limit=1`, { cache: 'no-store' });
      if (!res.ok) return null;
      const data = (await res.json()) as Array<{ lat: number; lng: number }>;
      if (!data?.length) return null;
      const first = data[0];
      return { lat: first.lat, lng: first.lng };
    } catch {
      return null;
    }
  }
  // On the server, go direct to the geocoding provider
  return geocodeAddress(HOUSE_ADDRESS);
}
