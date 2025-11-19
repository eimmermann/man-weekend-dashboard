import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
        return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const baseUrl = process.env.PROD_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

    try {
        const response = await fetch(`${baseUrl}/api/cron/discord-countdown`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${cronSecret}`,
                'Content-Type': 'application/json',
            },
        });

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
