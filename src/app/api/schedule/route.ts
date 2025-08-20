import { NextResponse } from 'next/server';
import { listActivities, createActivity } from '@/lib/db';

export async function GET() {
  const items = await listActivities();
  return NextResponse.json(items);
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const title = String(body.title || '').trim();
  const date = String(body.date || '');
  const start = String(body.start || '');
  const end = String(body.end || '');
  const color = typeof body.color === 'string' ? body.color : undefined;
  const notes = typeof body.notes === 'string' ? body.notes : undefined;
  const attendeeIds = Array.isArray(body.attendeeIds) ? body.attendeeIds.map((v: unknown) => String(v)) : undefined;
  if (!title || !date || !start || !end) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }
  const created = await createActivity({ title, date, start, end, color, notes, attendeeIds });
  return NextResponse.json(created);
}


