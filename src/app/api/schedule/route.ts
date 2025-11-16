import { NextRequest, NextResponse } from 'next/server';
import { listActivities, createActivity } from '@/lib/db';
import { parseYearParam } from '@/lib/api-utils';

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const yearParam = searchParams.get('year');
  const year = parseYearParam(yearParam);
  
  const items = await listActivities(year);
  return NextResponse.json(items);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
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
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error('Error creating activity:', error);
    return NextResponse.json({ error: 'Failed to create activity' }, { status: 500 });
  }
}


