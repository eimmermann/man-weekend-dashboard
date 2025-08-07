import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { APP_USER_AGENT } from '@/lib/constants';

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org/search';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q') || '';
  const limit = Number(searchParams.get('limit') || 5);

  const Schema = z.string().min(3);
  const parsed = Schema.safeParse(q.trim());
  if (!parsed.success) {
    return NextResponse.json([], { status: 200 });
  }

  const url = new URL(NOMINATIM_BASE);
  url.searchParams.set('q', parsed.data);
  url.searchParams.set('format', 'json');
  url.searchParams.set('addressdetails', '0');
  url.searchParams.set('limit', String(Math.max(1, Math.min(10, limit))));

  try {
    const res = await fetch(url.toString(), {
      headers: {
        'User-Agent': APP_USER_AGENT,
        'Accept-Language': 'en',
      },
      cache: 'no-store',
    });
    if (!res.ok) return NextResponse.json([], { status: 200 });
    const data = (await res.json()) as Array<{ place_id: string; display_name: string; lat: string; lon: string }>;
    const suggestions = data.map((d) => ({
      id: d.place_id,
      label: d.display_name,
      lat: Number(d.lat),
      lng: Number(d.lon),
    }));
    return NextResponse.json(suggestions);
  } catch {
    return NextResponse.json([], { status: 200 });
  }
}
