/**
 * Safely extract a display-friendly location string from a value
 * that may be a plain string, a JSON string, or a location object.
 */
export function formatLocation(location: unknown): string {
  if (!location) return '';

  if (typeof location === 'string') {
    // Detect stringified JSON objects
    if (location.startsWith('{')) {
      try {
        return formatLocationObject(JSON.parse(location));
      } catch {
        return location;
      }
    }
    return location;
  }

  if (typeof location === 'object') {
    return formatLocationObject(location as Record<string, unknown>);
  }

  return String(location);
}

function formatLocationObject(obj: Record<string, unknown>): string {
  const city = ((obj.city as string) || '').trim();
  const country = ((obj.country as string) || '').trim();

  if (city && country) return `${city}, ${country}`;
  if (obj.full) return String(obj.full);
  return city || country || ((obj.region as string) || '') || '';
}
