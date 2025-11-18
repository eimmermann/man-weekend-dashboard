import { NextRequest, NextResponse } from 'next/server';
import { listAppYears } from '@/lib/db';
import { fetchPokemonInfo, getCountdownDex } from '@/lib/pokemon-data';

const EASTERN_TZ = 'America/New_York';

function getEasternHour(): string {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: EASTERN_TZ,
    hour: '2-digit',
    hour12: false,
  });
  return formatter.format(new Date());
}

function parseTripDate(date: string | null | undefined): Date | null {
  if (!date) return null;
  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

function calculateDaysRemaining(startDate: Date): number {
  const now = new Date();
  const diffMs = startDate.getTime() - now.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

async function postToDiscord(payload: { content: string; embeds?: Array<{ description: string; image?: { url: string } }> }) {
  const webhook = process.env.DISCORD_COUNTDOWN_WEBHOOK;
  if (!webhook) {
    throw new Error('Missing DISCORD_COUNTDOWN_WEBHOOK');
  }
  const res = await fetch(webhook, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(`Discord webhook failed with ${res.status}`);
  }
}

export async function POST(req: NextRequest) {
  const expectedSecret = process.env.CRON_SECRET;
  if (expectedSecret) {
    const auth = req.headers.get('authorization');
    if (auth !== `Bearer ${expectedSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  // Ensure we only post once the local Eastern hour hits 09
  if (getEasternHour() !== '09') {
    return new NextResponse(null, { status: 204 });
  }

  const years = await listAppYears();
  const activeYear = years.find(y => y.tripStartDate && y.tripEndDate) ?? years[0];
  if (!activeYear?.tripStartDate || !activeYear.tripEndDate) {
    return new NextResponse(null, { status: 204 });
  }

  const startDate = parseTripDate(activeYear.tripStartDate);
  if (!startDate) {
    return new NextResponse(null, { status: 204 });
  }

  const daysRemaining = calculateDaysRemaining(startDate);
  if (daysRemaining <= 0) {
    return new NextResponse(null, { status: 204 });
  }

  const siteUrl = process.env.PROD_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL || '';
  let message = `🗓️ ${daysRemaining} day${daysRemaining === 1 ? '' : 's'} until Man Weekend ${activeYear.year}!`;
  if (siteUrl) {
    message += `\n🔗 ${siteUrl}`;
  }
  const dex = getCountdownDex(daysRemaining);
  const poke = await fetchPokemonInfo(dex);

  const embeds = poke
    ? [
        {
          description: `#${poke.id} ${poke.name.replace('-', ' ')}${poke.flavor_text ? ` — ${poke.flavor_text}` : ''}`,
          image: {
            url: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${poke.id}.png`,
          },
        },
      ]
    : undefined;

  await postToDiscord({ content: message, embeds });

  return new NextResponse(null, { status: 204 });
}
