import { ImageResponse } from 'next/og';

export const size = {
  width: 64,
  height: 64,
};

export const contentType = 'image/png';

// AIDEV-NOTE: Generated favicon keeps branding consistent between hero banner + browser chrome.
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'radial-gradient(circle at 20% 20%, #fde68a, #f97316 40%, #312e81 75%)',
          borderRadius: '16%',
          position: 'relative',
          fontFamily: '"Inter", "Helvetica Neue", "Segoe UI", sans-serif',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: '8%',
            borderRadius: '20%',
            boxShadow: 'inset 0 0 6px rgba(255,255,255,0.25)',
            border: '2px solid rgba(255,255,255,0.2)',
          }}
        />
        <span
          style={{
            fontSize: 30,
            fontWeight: 700,
            color: '#fff',
            letterSpacing: '-0.06em',
            textShadow: '0 4px 8px rgba(0,0,0,0.45)',
          }}
        >
          MW
        </span>
      </div>
    ),
    {
      ...size,
    },
  );
}
