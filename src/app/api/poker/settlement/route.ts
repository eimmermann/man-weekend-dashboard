import { NextRequest, NextResponse } from 'next/server';
import { computePokerSettlement, pokerSummaryByAttendee } from '@/lib/db';

export async function GET() {
  try {
    const summary = await pokerSummaryByAttendee();
    const transfers = computePokerSettlement(summary);
    return NextResponse.json({ summary, transfers });
  } catch (e) {
    console.error('Poker settlement error', e);
    return NextResponse.json({ error: 'Failed to compute settlement' }, { status: 500 });
  }
}


