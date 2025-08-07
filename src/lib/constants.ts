export const TRIP_START_ISO = "2025-09-11T00:00:00-04:00"; // 9/11/25 start
export const TRIP_END_ISO = "2025-09-15T23:59:59-04:00";   // 9/15/25 end

export const TRIP_NAME = 'Man Weekend 2025';
export const HOUSE_ADDRESS = "15 Goldring Drive, Highland Lake, NY 12743";
export const AIRBNB_URL = 'https://www.airbnb.com/rooms/880325538027550159?viralityEntryPoint=1&s=76';
// Optional: paste a direct image URL from the Airbnb listing here to show a hero image.
// If left empty, a local placeholder will be used.
export const HERO_IMAGE_URL = 'https://a0.muscache.com/im/pictures/72066d46-fa14-4982-9fb9-f75ad96ac6e2.jpg?im_w=1200';

export const APP_USER_AGENT =
  (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_APP_NAME) ||
  'man-weekend-dashboard/1.0 (+https://example.com)';

// Defaults for attendee modal
export const DEFAULT_ARRIVAL_DATE = '2025-09-11';
export const DEFAULT_DEPARTURE_DATE = '2025-09-14';
