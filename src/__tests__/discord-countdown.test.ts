import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { POST } from '@/app/api/cron/discord-countdown/route';
import { NextRequest } from 'next/server';

// Mock the dependencies
vi.mock('@/lib/db', () => ({
    listAppYears: vi.fn(),
}));

vi.mock('@/lib/pokemon-data', () => ({
    fetchPokemonInfo: vi.fn(),
    getCountdownDex: vi.fn(),
}));

describe('Discord Countdown API', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        vi.resetAllMocks();
        process.env = { ...originalEnv };
        // Set up default env vars
        process.env.CRON_SECRET = 'test-secret';
        process.env.DISCORD_COUNTDOWN_WEBHOOK = 'https://discord.com/api/webhooks/test';
    });

    afterEach(() => {
        process.env = originalEnv;
    });

    it('should return 401 when CRON_SECRET does not match', async () => {
        const request = new NextRequest('http://localhost:3000/api/cron/discord-countdown', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer wrong-secret',
            },
        });

        const response = await POST(request);
        expect(response.status).toBe(401);
        const data = await response.json();
        expect(data.error).toBe('Unauthorized');
    });

    it('should return 204 when no active year with trip dates exists', async () => {
        const { listAppYears } = await import('@/lib/db');
        (listAppYears as any).mockResolvedValue([
            { year: 2024, tripStartDate: null, tripEndDate: null },
        ]);

        const request = new NextRequest('http://localhost:3000/api/cron/discord-countdown', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer test-secret',
            },
        });

        const response = await POST(request);
        expect(response.status).toBe(204);
    });

    it('should return 204 when days remaining is <= 0', async () => {
        const { listAppYears } = await import('@/lib/db');
        const pastDate = new Date();
        pastDate.setDate(pastDate.getDate() - 10);
        const pastDateStr = pastDate.toISOString().split('T')[0];

        (listAppYears as any).mockResolvedValue([
            {
                year: 2024,
                tripStartDate: pastDateStr,
                tripEndDate: pastDateStr,
            },
        ]);

        const request = new NextRequest('http://localhost:3000/api/cron/discord-countdown', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer test-secret',
            },
        });

        const response = await POST(request);
        expect(response.status).toBe(204);
    });

    it('should successfully post to Discord when conditions are met', async () => {
        const { listAppYears } = await import('@/lib/db');
        const { fetchPokemonInfo, getCountdownDex } = await import('@/lib/pokemon-data');

        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 30);
        const futureDateStr = futureDate.toISOString().split('T')[0];

        (listAppYears as any).mockResolvedValue([
            {
                year: 2025,
                tripStartDate: futureDateStr,
                tripEndDate: futureDateStr,
            },
        ]);

        (getCountdownDex as any).mockReturnValue(25);
        (fetchPokemonInfo as any).mockResolvedValue({
            id: 25,
            name: 'pikachu',
            flavor_text: 'When several of these Pokémon gather, their electricity could build and cause lightning storms.',
        });

        // Mock the fetch call to Discord
        global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            status: 204,
        });

        const request = new NextRequest('http://localhost:3000/api/cron/discord-countdown', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer test-secret',
            },
        });

        const response = await POST(request);
        expect(response.status).toBe(204);
        expect(global.fetch).toHaveBeenCalledWith(
            'https://discord.com/api/webhooks/test',
            expect.objectContaining({
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
            })
        );
    });

    it('should work without CRON_SECRET when not configured', async () => {
        delete process.env.CRON_SECRET;

        const { listAppYears } = await import('@/lib/db');
        (listAppYears as any).mockResolvedValue([
            { year: 2024, tripStartDate: null, tripEndDate: null },
        ]);

        const request = new NextRequest('http://localhost:3000/api/cron/discord-countdown', {
            method: 'POST',
        });

        const response = await POST(request);
        // Should not be 401, since CRON_SECRET is not set
        expect(response.status).not.toBe(401);
    });
});
