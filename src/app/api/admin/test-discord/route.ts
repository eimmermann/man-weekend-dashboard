import { NextRequest, NextResponse } from 'next/server';
import { POST as discordCountdownHandler } from '@/app/api/cron/discord-countdown/route';

export async function POST(req: NextRequest) {
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
        return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    try {
        // Create a new request with the proper authorization header
        const testRequest = new NextRequest(new URL('/api/cron/discord-countdown', req.url), {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${cronSecret}`,
            },
        });

        // Call the Discord countdown handler directly
        const response = await discordCountdownHandler(testRequest);

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            return NextResponse.json(
                { error: errorData.error || 'Failed to trigger Discord webhook' },
                { status: response.status }
            );
        }

        return new NextResponse(null, { status: 204 });
    } catch (error) {
        console.error('Failed to trigger Discord webhook:', error);
        return NextResponse.json(
            { error: 'Failed to trigger Discord webhook' },
            { status: 500 }
        );
    }
}
