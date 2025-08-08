"use client";

import { useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';
import type { Attendee } from '@/types';
import { geocodeHouse } from '@/lib/geocode';
import { HOUSE_ADDRESS } from '@/lib/constants';
import { APIProvider, Map, AdvancedMarker, Marker, useMap } from "@vis.gl/react-google-maps";

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

  // Must be NEXT_PUBLIC_* to be available in the browser bundle
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const mapId = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID;

  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm relative z-10 min-h-[360px]">
      <div className="absolute inset-0 bg-zinc-100 dark:bg-zinc-900">
        {!apiKey && (
          <div className="h-full w-full flex items-center justify-center text-sm opacity-70 px-4 text-center">
            Set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY in your environment to display the map.
          </div>
        )}
        {mounted && apiKey && (
          <APIProvider apiKey={apiKey} libraries={["marker"]}>
            <Map
              style={{ width: '100%', height: '100%' }}
              defaultZoom={6}
              defaultCenter={house || { lat: 40.75, lng: -73.98 }}
              mapId={mapId}
            >
              <FitBounds bounds={bounds} />
              {house && (
                mapId ? (
                  <AdvancedMarker position={house} title={HOUSE_ADDRESS} zIndex={1000}>
                    <div style={{ fontSize: 28, lineHeight: 1, color: '#eab308', textShadow: '0 1px 2px rgba(0,0,0,.6)' }}>★</div>
                  </AdvancedMarker>
                ) : (
                  <Marker
                    position={house}
                    title={HOUSE_ADDRESS}
                    zIndex={1000}
                    icon={`data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
                      '<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="#eab308" stroke="#a16207" stroke-width="1.5"><path d="M12 2l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 17.8 6.2 20.9l1.1-6.5L2.6 8.8l6.5-.9L12 2z"/></svg>'
                    )}`}
                  />
                )
              )}
              {attendees.map(a => a.location ? (
                <div key={a.id}>
                  {mapId ? (
                    <AdvancedMarker position={a.location} title={`${a.name} — ${a.startingAddress}`}>
                      <div
                        style={{
                          width: 16,
                          height: 16,
                          background: '#2563eb', // indigo-600
                          borderRadius: '9999px',
                          border: '2px solid #ffffff',
                          boxShadow: '0 1px 3px rgba(0,0,0,.6)'
                        }}
                      />
                    </AdvancedMarker>
                  ) : (
                    <Marker
                      position={a.location}
                      title={`${a.name} — ${a.startingAddress}`}
                      icon={`data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
                        '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18"><circle cx="9" cy="9" r="7" fill="#2563eb" stroke="#ffffff" stroke-width="2"/></svg>'
                      )}`}
                    />
                  )}
                </div>
              ) : null)}
            </Map>
          </APIProvider>
        )}
        {apiKey && !mapId && (
          <div className="absolute bottom-2 left-2 text-[11px] opacity-70 bg-white/70 dark:bg-zinc-900/70 rounded px-2 py-1">
            Tip: Set NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID for Advanced Markers.
          </div>
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
