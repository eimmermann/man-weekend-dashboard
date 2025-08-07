export function formatAddress(displayName: string): string {
  if (!displayName || typeof displayName !== 'string') return '';

  // Split on commas and normalize whitespace
  const parts = displayName
    .split(',')
    .map(p => p.trim())
    .filter(Boolean);

  if (parts.length === 0) return '';

  // Heuristic assumptions based on Nominatim display_name ordering for US addresses:
  // [house_number, road, suburb?, city/town/village, county, state, postcode, country]
  const houseNumber = parts[0] || '';
  const street = parts[1] || '';

  // Find ZIP code token (5 digits or ZIP+4)
  const zipRegex = /\b\d{5}(?:-\d{4})?\b/;
  const zipIndex = parts.findIndex(p => zipRegex.test(p));
  const zip = zipIndex >= 0 ? (parts[zipIndex].match(zipRegex)?.[0] || '') : '';

  // Find state: prefer token immediately before ZIP if present; otherwise, look for any token
  let state = '';
  if (zipIndex > 0) {
    const candidate = parts[zipIndex - 1];
    if (candidate && !/\d/.test(candidate) && !/County/i.test(candidate) && !/United\s+States/i.test(candidate)) {
      state = candidate;
    }
  }
  if (!state) {
    // Fallback: choose the last token that looks like a state (no digits, not county/country), favor tokens after street
    for (let i = parts.length - 1; i >= 2; i--) {
      const p = parts[i];
      if (!/\d/.test(p) && !/County/i.test(p) && !/United\s+States?/i.test(p)) {
        state = p;
        break;
      }
    }
  }

  // Determine boundaries to search for town between street and county/state/zip
  const countyIndex = parts.findIndex(p => /County/i.test(p));
  const boundaryIndexCandidates = [countyIndex, zipIndex, state ? parts.indexOf(state) : -1].filter(i => i > 0);
  const boundaryIndex = boundaryIndexCandidates.length ? Math.min(...boundaryIndexCandidates) : parts.length;

  // Choose the last token between index 2 and boundaryIndex as the town
  let town = '';
  for (let i = Math.min(boundaryIndex - 1, parts.length - 1); i >= 2; i--) {
    const token = parts[i];
    if (!token) continue;
    // Skip obvious neighborhood words but allow actual town/city names
    if (/County/i.test(token)) continue;
    if (/United\s+States?/i.test(token)) continue;
    town = token;
    break;
  }

  // Build formatted string
  const left = [houseNumber, street, town].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
  const right = [zip, state].filter(Boolean).join(' ').trim();
  if (left && right) return `${left}, ${right}`;
  return left || right || displayName;
}

export default formatAddress;


