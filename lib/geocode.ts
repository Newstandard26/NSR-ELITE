// Server-side geocoding via Google Geocoding API.
// Falls back to (0,0) with a flag so imports never hard-fail on a bad row.

export interface GeocodeResult {
  lat: number;
  lng: number;
  ok: boolean;
}

export async function geocodeAddress(fullAddress: string): Promise<GeocodeResult> {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) return { lat: 0, lng: 0, ok: false };

  const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
  url.searchParams.set("address", fullAddress);
  url.searchParams.set("key", key);

  try {
    const res = await fetch(url.toString(), { cache: "no-store" });
    const data = (await res.json()) as {
      status: string;
      results: { geometry: { location: { lat: number; lng: number } } }[];
    };
    if (data.status === "OK" && data.results[0]) {
      const { lat, lng } = data.results[0].geometry.location;
      return { lat, lng, ok: true };
    }
  } catch (err) {
    console.error("Geocode failed:", err);
  }
  return { lat: 0, lng: 0, ok: false };
}

export function composeAddress(parts: {
  address: string;
  city: string;
  state: string;
  zip: string;
}): string {
  return `${parts.address}, ${parts.city}, ${parts.state} ${parts.zip}`.trim();
}
