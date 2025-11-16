/**
 * Parses a year parameter from URL search params
 * @param yearParam - The year parameter string from URL search params
 * @returns The parsed year number, or undefined if param is null or invalid
 *
 * AIDEV-NOTE: Centralized year parsing utility to ensure consistent validation across all API routes.
 * Returns undefined for null/invalid values instead of throwing, allowing routes to handle defaults.
 */
export function parseYearParam(yearParam: string | null): number | undefined {
  if (yearParam === null) {
    return undefined;
  }

  const parsed = parseInt(yearParam, 10);

  if (isNaN(parsed)) {
    return undefined;
  }

  return parsed;
}
