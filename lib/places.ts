// Server-side Google Places helpers. The API key stays on the server; the
// browser talks to our own /api/places/* routes, never to Google directly.

export interface PlacePrediction {
  placeId: string;
  description: string;
}

export interface PlaceDetails {
  address: string; // street number + route
  city: string;
  state: string; // 2-letter
  zip: string;
  lat: number;
  lng: number;
  formatted: string;
}

const KEY = () => process.env.GOOGLE_PLACES_API_KEY;

// Autocomplete predictions, biased to US addresses.
export async function placeAutocomplete(
  input: string,
  sessionToken?: string,
): Promise<PlacePrediction[]> {
  const key = KEY();
  if (!key || input.trim().length < 3) return [];

  const url = new URL("https://maps.googleapis.com/maps/api/place/autocomplete/json");
  url.searchParams.set("input", input);
  url.searchParams.set("key", key);
  url.searchParams.set("types", "address");
  url.searchParams.set("components", "country:us");
  if (sessionToken) url.searchParams.set("sessiontoken", sessionToken);

  const res = await fetch(url.toString(), { cache: "no-store" });
  const data = (await res.json()) as {
    status: string;
    predictions: { place_id: string; description: string }[];
  };
  if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
    console.error("Places autocomplete error:", data.status);
    return [];
  }
  return (data.predictions || []).map((p) => ({ placeId: p.place_id, description: p.description }));
}

// Resolve a place id to structured address + coordinates.
export async function placeDetails(
  placeId: string,
  sessionToken?: string,
): Promise<PlaceDetails | null> {
  const key = KEY();
  if (!key) return null;

  const url = new URL("https://maps.googleapis.com/maps/api/place/details/json");
  url.searchParams.set("place_id", placeId);
  url.searchParams.set("key", key);
  url.searchParams.set("fields", "address_component,geometry,formatted_address");
  if (sessionToken) url.searchParams.set("sessiontoken", sessionToken);

  const res = await fetch(url.toString(), { cache: "no-store" });
  const data = (await res.json()) as {
    status: string;
    result?: {
      formatted_address?: string;
      geometry?: { location: { lat: number; lng: number } };
      address_components?: { long_name: string; short_name: string; types: string[] }[];
    };
  };
  if (data.status !== "OK" || !data.result) return null;

  const comps = data.result.address_components || [];
  const get = (type: string, short = false) => {
    const c = comps.find((x) => x.types.includes(type));
    return c ? (short ? c.short_name : c.long_name) : "";
  };

  const streetNumber = get("street_number");
  const route = get("route");

  return {
    address: [streetNumber, route].filter(Boolean).join(" "),
    city: get("locality") || get("sublocality") || get("postal_town"),
    state: get("administrative_area_level_1", true),
    zip: get("postal_code"),
    lat: data.result.geometry?.location.lat ?? 0,
    lng: data.result.geometry?.location.lng ?? 0,
    formatted: data.result.formatted_address || "",
  };
}
