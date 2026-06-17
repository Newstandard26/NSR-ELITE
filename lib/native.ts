// Thin bridge so the web app can use native device features when running inside
// the Capacitor shell (iOS/Android), and fall back to browser APIs on the web.
// Everything is lazily imported so the web/SSR bundle never loads native code.

interface Coords {
  lat: number;
  lng: number;
}

// True only inside the native Capacitor shell.
export function isNative(): boolean {
  if (typeof window === "undefined") return false;
  const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
  return !!cap?.isNativePlatform?.();
}

// Gets the device's current position via the native Geolocation plugin (which
// handles the OS permission prompt) on device, or the browser API on the web.
export async function getCurrentPosition(): Promise<Coords> {
  if (isNative()) {
    const { Geolocation } = await import("@capacitor/geolocation");
    const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true });
    return { lat: pos.coords.latitude, lng: pos.coords.longitude };
  }
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error("Geolocation not available"));
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      (err) => reject(err),
      { enableHighAccuracy: true },
    );
  });
}
