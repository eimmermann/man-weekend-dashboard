import { NextRequest, NextResponse } from 'next/server';
import { deleteAttendee, updateAttendee } from '@/lib/db';
import { z } from 'zod';
import { geocodeAddress } from '@/lib/geocode';

export async function DELETE(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  const result = await deleteAttendee(id);
  if (!result.ok) {
    if (result.reason === 'not_found') return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (result.reason === 'referenced') return NextResponse.json({ error: 'Attendee is referenced by expenses' }, { status: 409 });
  }
  return new NextResponse(null, { status: 204 });
}

const UpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  startingAddress: z.string().min(1).max(300).optional(),
  arrivalDate: z.string().date().or(z.literal('')).optional(),
  departureDate: z.string().date().or(z.literal('')).optional(),
});

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  const body = await req.json().catch(() => ({}));
  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  const data = parsed.data as { name?: string; startingAddress?: string; arrivalDate?: string; departureDate?: string };

  let location: { lat: number; lng: number } | null | undefined = undefined;
  if (data.startingAddress) {
    location = await geocodeAddress(data.startingAddress);
  }

  const updated = await updateAttendee(id, {
    name: data.name,
    startingAddress: data.startingAddress,
    arrivalDate: data.arrivalDate ? data.arrivalDate : null,
    departureDate: data.departureDate ? data.departureDate : null,
    location,
  });
  if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(updated);
}
