import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAttendee, listAttendees } from '@/lib/db';
import { geocodeAddress } from '@/lib/geocode';
import { parseYearParam } from '@/lib/api-utils';

const CreateSchema = z.object({
  name: z.string().min(1).max(100),
  startingAddress: z.string().min(1).max(300),
  year: z.number().int().min(2000).max(2100),
  arrivalDate: z.string().date().or(z.literal('').transform(() => undefined)).optional(),
  departureDate: z.string().date().or(z.literal('').transform(() => undefined)).optional(),
});

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const yearParam = searchParams.get('year');
  const year = parseYearParam(yearParam);
  
  const attendees = await listAttendees(year);
  return NextResponse.json(attendees);
}

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const parsed = CreateSchema.safeParse(data);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid payload', details: parsed.error.issues }, { status: 400 });
    }
    const { name, startingAddress, year, arrivalDate, departureDate } = parsed.data as { name: string; startingAddress: string; year: number; arrivalDate?: string; departureDate?: string };
    const location = await geocodeAddress(startingAddress);
    const attendee = await createAttendee({ name, startingAddress, year, arrivalDate: arrivalDate ?? null, departureDate: departureDate ?? null, location });
    return NextResponse.json(attendee, { status: 201 });
  } catch (error) {
    console.error('Error creating attendee:', error);
    return NextResponse.json({ error: 'Failed to create attendee' }, { status: 500 });
  }
}
