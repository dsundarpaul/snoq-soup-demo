export const GOOGLE_MAPS_SCRIPT_ID = "google-maps-places-js";

export function loadGoogleMapsScript(apiKey: string): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.google?.maps?.places) return Promise.resolve();

  const existing = document.getElementById(
    GOOGLE_MAPS_SCRIPT_ID
  ) as HTMLScriptElement | null;
  if (existing) {
    return new Promise((resolve, reject) => {
      if (window.google?.maps?.places) {
        resolve();
        return;
      }
      const done = () => {
        if (window.google?.maps?.places) resolve();
        else reject(new Error("Google Maps failed"));
      };
      existing.addEventListener("load", done, { once: true });
      existing.addEventListener(
        "error",
        () => reject(new Error("Script error")),
        { once: true }
      );
    });
  }

  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.id = GOOGLE_MAPS_SCRIPT_ID;
    s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(
      apiKey
    )}&libraries=places`;
    s.async = true;
    s.defer = true;
    s.onload = () => {
      if (window.google?.maps?.places) resolve();
      else reject(new Error("Google Maps not available"));
    };
    s.onerror = () => reject(new Error("Could not load script"));
    document.head.appendChild(s);
  });
}
