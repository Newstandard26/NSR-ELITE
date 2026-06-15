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

export interface ReverseResult {
  address: string;
  city: string;
  state: string;
  zip: string;
}

// Reverse-geocode a lat/lng to address components (for tap-to-drop pins).
export async function reverseGeocode(lat: number, lng: number): Promise<ReverseResult> {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  const fallback = { address: `${lat.toFixed(5)}, ${lng.toFixed(5)}`, city: "", state: "", zip: "" };
  if (!key) return fallback;
  try {
    const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
    url.searchParams.set("latlng", `${lat},${lng}`);
    url.searchParams.set("key", key);
    const res = await fetch(url.toString(), { cache: "no-store" });
    const data = (await res.json()) as {
      status: string;
      results: { address_components: { long_name: string; short_name: string; types: string[] }[] }[];
    };
    const comps = data.results?.[0]?.address_components;
    if (data.status !== "OK" || !comps) return fallback;
    const get = (type: string, short = false) => {
      const c = comps.find((x) => x.types.includes(type));
      return c ? (short ? c.short_name : c.long_name) : "";
    };
    const street = [get("street_number"), get("route")].filter(Boolean).join(" ");
    return {
      address: street || fallback.address,
      city: get("locality") || get("sublocality") || get("postal_town"),
      state: get("administrative_area_level_1", true),
      zip: get("postal_code"),
    };
  } catch {
    return fallback;
  }
}
