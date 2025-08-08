import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q') || '';
  const limit = Math.max(1, Math.min(10, Number(searchParams.get('limit') || 5)));
  const key = process.env.GOOGLE_MAPS_API_KEY;

  const Schema = z.string().min(3);
  const parsed = Schema.safeParse(q.trim());
  if (!parsed.success || !key) {
    return NextResponse.json([], { status: 200 });
  }

  const url = new URL('https://maps.googleapis.com/maps/api/geocode/json');
  url.searchParams.set('address', parsed.data);
  url.searchParams.set('key', key);

  try {
    const res = await fetch(url.toString(), { cache: 'no-store' });
    if (!res.ok) return NextResponse.json([], { status: 200 });
    const data = (await res.json()) as {
      results?: Array<{ place_id: string; formatted_address: string; geometry: { location: { lat: number; lng: number } } }>;
    };
    const suggestions = (data.results || []).slice(0, limit).map(r => ({
      id: r.place_id,
      label: r.formatted_address,
      lat: r.geometry.location.lat,
      lng: r.geometry.location.lng,
    }));
    return NextResponse.json(suggestions);
  } catch {
    return NextResponse.json([], { status: 200 });
  }
}
