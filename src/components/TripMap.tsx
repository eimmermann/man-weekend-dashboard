"use client";

import { useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';
import type { Attendee } from '@/types';
import { geocodeHouse } from '@/lib/geocode';
import { HOUSE_ADDRESS } from '@/lib/constants';
import { APIProvider, Map, Marker, useMap } from "@vis.gl/react-google-maps";

const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function TripMap() {
  const { data: attendees = [] } = useSWR<Attendee[]>('/api/attendees', fetcher);
  const [house, setHouse] = useState<{ lat: number; lng: number } | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    geocodeHouse().then(setHouse);
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  const bounds = useMemo(() => {
    const points = [house, ...attendees.map(a => a.location).filter(Boolean) as { lat: number; lng: number }[]].filter(Boolean) as { lat: number; lng: number }[];
    if (!points.length) return undefined;
    const lats = points.map(p => p.lat);
    const lngs = points.map(p => p.lng);
    return {
      north: Math.max(...lats),
      south: Math.min(...lats),
      east: Math.max(...lngs),
      west: Math.min(...lngs),
    };
  }, [attendees, house]);

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY;

  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm relative z-10">
      <div className="h-[420px] w-full">
        {mounted && apiKey && (
          <APIProvider apiKey={apiKey}>
            <Map
              style={{ width: '100%', height: '100%' }}
              defaultZoom={6}
              defaultCenter={house || { lat: 40.75, lng: -73.98 }}
            >
              <FitBounds bounds={bounds} />
              {house && (
                <Marker position={house} title={HOUSE_ADDRESS} icon={{
                  path: google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
                  scale: 6,
                  fillColor: '#eab308',
                  fillOpacity: 1,
                  strokeColor: '#a16207',
                  strokeWeight: 2,
                }} />
              )}
              {attendees.map(a => a.location ? (
                <div key={a.id}>
                  <Marker position={a.location} title={`${a.name} — ${a.startingAddress}`} />
                  {/* Optionally draw lines via Google Maps Polyline if needed later */}
                </div>
              ) : null)}
            </Map>
          </APIProvider>
        )}
      </div>
    </div>
  );
}

function FitBounds({ bounds }: { bounds: { north: number; south: number; east: number; west: number } | undefined }) {
  const map = useMap();
  useEffect(() => {
    if (!map || !bounds) return;
    map.fitBounds(bounds);
  }, [map, bounds]);
  return null;
}
