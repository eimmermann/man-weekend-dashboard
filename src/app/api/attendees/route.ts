import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAttendee, listAttendees } from '@/lib/db';
import { geocodeAddress } from '@/lib/geocode';
import { formatAddress } from '@/lib/formatAddress';

const CreateSchema = z.object({
  name: z.string().min(1).max(100),
  startingAddress: z.string().min(1).max(300),
  arrivalDate: z.string().date().or(z.literal('').transform(() => undefined)).optional(),
  departureDate: z.string().date().or(z.literal('').transform(() => undefined)).optional(),
});

export async function GET() {
  const attendees = await listAttendees();
  return NextResponse.json(attendees);
}

export async function POST(req: NextRequest) {
  const data = await req.json().catch(() => ({}));
  const parsed = CreateSchema.safeParse(data);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }
  const { name, startingAddress, arrivalDate, departureDate } = parsed.data as { name: string; startingAddress: string; arrivalDate?: string; departureDate?: string };
  const location = await geocodeAddress(startingAddress);
  const formatted = formatAddress(startingAddress) || startingAddress;
  const attendee = await createAttendee({ name, startingAddress: formatted, arrivalDate: arrivalDate ?? null, departureDate: departureDate ?? null, location });
  return NextResponse.json(attendee, { status: 201 });
}
