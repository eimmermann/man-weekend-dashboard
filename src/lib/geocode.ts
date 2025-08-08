import { HOUSE_ADDRESS } from './constants';

export type Coordinates = { lat: number; lng: number };

export async function geocodeAddress(address: string): Promise<Coordinates | null> {
  try {
    const key = process.env.GOOGLE_MAPS_API_KEY;
    if (!key) return null;
    const url = new URL('https://maps.googleapis.com/maps/api/geocode/json');
    url.searchParams.set('address', address);
    url.searchParams.set('key', key);
    const res = await fetch(url.toString(), { cache: 'no-store' });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      results?: Array<{ geometry: { location: { lat: number; lng: number } } }>;
    };
    const first = data.results?.[0];
    if (!first) return null;
    return { lat: first.geometry.location.lat, lng: first.geometry.location.lng };
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
