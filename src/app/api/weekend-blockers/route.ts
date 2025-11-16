import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createWeekendEvent, deleteWeekendEvent, listWeekendBlockers, listBlockedWeekends, updateWeekendEvent } from '@/lib/db';
import { parseYearParam } from '@/lib/api-utils';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const yearParam = searchParams.get('year');
    const year = parseYearParam(yearParam);
    // Use legacy function for backwards compatibility with UI
    const blockers = await listWeekendBlockers(year || 2026);
    return NextResponse.json(blockers);
  } catch (error) {
    console.error('Error loading blockers:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load blockers' },
      { status: 500 }
    );
  }
}

const CreateSchema = z.object({
  attendeeId: z.string().min(1),
  eventName: z.string().min(1).max(200),
  eventDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  weekendChoice: z.enum(['before', 'after', 'both']),
  isRecurring: z.boolean().default(false),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = CreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid payload', details: parsed.error.issues }, { status: 400 });
    }

    const created = await createWeekendEvent(parsed.data);
    // Return in legacy format for backwards compatibility
    const blockers = await listWeekendBlockers();
    const matchingBlocker = blockers.find(b =>
      b.eventDate === created.eventDate &&
      b.attendeeId === created.attendeeId &&
      b.eventName === created.eventName
    );

    if (matchingBlocker) {
      return NextResponse.json(matchingBlocker, { status: 201 });
    }

    // Fallback: return a simplified blocker representation
    return NextResponse.json({
      id: created.id,
      attendeeId: created.attendeeId,
      eventName: created.eventName,
      eventDate: created.eventDate,
      weekendStartDate: created.eventDate, // Approximate
      isRecurring: created.isRecurring,
      createdAt: created.createdAt,
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating weekend event:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to create event' }, { status: 500 });
  }
}

const UpdateSchema = z.object({
  eventName: z.string().min(1).max(200).optional(),
  eventDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  weekendChoice: z.enum(['before', 'after', 'both']).optional(),
  isRecurring: z.boolean().optional(),
});

export async function PUT(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    }

    const body = await req.json();
    const parsed = UpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid payload', details: parsed.error.issues }, { status: 400 });
    }

    const updated = await updateWeekendEvent(id, parsed.data);
    if (!updated) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Return in legacy format for backwards compatibility
    const blockers = await listWeekendBlockers();
    const matchingBlocker = blockers.find(b => b.id === id || (
      b.eventDate === updated.eventDate &&
      b.attendeeId === updated.attendeeId &&
      b.eventName === updated.eventName
    ));

    if (matchingBlocker) {
      return NextResponse.json(matchingBlocker);
    }

    // Fallback
    return NextResponse.json({
      id: updated.id,
      attendeeId: updated.attendeeId,
      eventName: updated.eventName,
      eventDate: updated.eventDate,
      weekendStartDate: updated.eventDate,
      isRecurring: updated.isRecurring,
      createdAt: updated.createdAt,
    });
  } catch (error) {
    console.error('Error updating weekend event:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to update event' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  }
  
  // Try to delete as event ID first
  let ok = await deleteWeekendEvent(id);
  
  // If not found as event, try to find the event ID from blocked weekend
  if (!ok) {
    const blocked = await listBlockedWeekends();
    const block = blocked.find(b => b.id === id);
    if (block) {
      ok = await deleteWeekendEvent(block.eventId);
    }
  }
  
  if (!ok) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  return new NextResponse(null, { status: 204 });
}

