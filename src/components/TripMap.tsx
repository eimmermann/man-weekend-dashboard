"use client";

import 'leaflet/dist/leaflet.css';
import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import useSWR from 'swr';
import type { Attendee } from '@/types';
import { formatAddress } from '@/lib/formatAddress';
import { geocodeHouse } from '@/lib/geocode';
import { HOUSE_ADDRESS } from '@/lib/constants';

const MapContainer = dynamic(() => import('react-leaflet').then(m => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(m => m.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then(m => m.Marker), { ssr: false });
const Polyline = dynamic(() => import('react-leaflet').then(m => m.Polyline), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then(m => m.Popup), { ssr: false });

const fetcher = (url: string) => fetch(url).then(r => r.json());

// Note: Leaflet icon path fix will be done inside the component via useEffect

export default function TripMap() {
  const { data: attendees = [] } = useSWR<Attendee[]>('/api/attendees', fetcher);
  const [house, setHouse] = useState<{ lat: number; lng: number } | null>(null);
  const [starIcon, setStarIcon] = useState<import('leaflet').DivIcon | null>(null);
  const [mounted, setMounted] = useState(false);

  // Ensure default marker icon assets are resolved from /public (client-only)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    import('leaflet').then(({ default: L }) => {
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: '/leaflet/marker-icon-2x.png',
        iconUrl: '/leaflet/marker-icon.png',
        shadowUrl: '/leaflet/marker-shadow.png',
      });

      // Create a star icon for the house location
      const star = L.divIcon({
        html: '<div style="font-size:24px; line-height:1; color:#eab308; text-shadow:0 1px 2px rgba(0,0,0,.6)">★</div>',
        className: 'house-star-icon',
        iconSize: [24, 24],
        iconAnchor: [12, 18],
        popupAnchor: [0, -18],
      });
      setStarIcon(star);
    }).catch(() => {
      // ignore
    });
  }, []);

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
    return [
      [Math.min(...lats), Math.min(...lngs)],
      [Math.max(...lats), Math.max(...lngs)],
    ] as [[number, number], [number, number]];
  }, [attendees, house]);

  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm relative z-10">
      <div className="h-[420px] w-full">
        {mounted && (
          <MapContainer bounds={bounds} center={house ? [house.lat, house.lng] : [40.75, -73.98]} zoom={6} style={{ height: '100%', width: '100%' }}>
            <TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            {house && (
              <Marker position={[house.lat, house.lng]} icon={starIcon || undefined}>
                <Popup>
                  <div className="font-medium mb-1">Man Weekend House</div>
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(HOUSE_ADDRESS)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-indigo-700 dark:text-indigo-300 hover:underline break-words"
                  >
                    {HOUSE_ADDRESS}
                  </a>
                </Popup>
              </Marker>
            )}
            {attendees.map(a => a.location ? (
              <div key={a.id}>
                <Marker position={[a.location.lat, a.location.lng]}>
                  <Popup>
                    <div className="font-medium">{a.name}</div>
                    <div className="text-xs opacity-70 max-w-[180px]">{formatAddress(a.startingAddress)}</div>
                  </Popup>
                </Marker>
                {house && (
                  <Polyline positions={[[a.location.lat, a.location.lng], [house.lat, house.lng]]} pathOptions={{ color: '#6366f1', weight: 3, opacity: 0.8 }} />
                )}
              </div>
            ) : null)}
          </MapContainer>
        )}
      </div>
    </div>
  );
}
