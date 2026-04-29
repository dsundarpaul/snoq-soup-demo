"use client";

import { useEffect, useRef, useState } from "react";
import { MapPin, Loader2 } from "lucide-react";
import { loadGoogleMapsScript } from "@/lib/google-maps-script";

const DEFAULT_CENTER = { lat: 24.7136, lng: 46.6753 };

function clampRadiusMeters(value: number): number {
  if (!Number.isFinite(value) || value < 5) return 15;
  return Math.min(value, 2000);
}

export function isValidMapPosition(
  latitude: number | null | undefined,
  longitude: number | null | undefined
): boolean {
  return (
    typeof latitude === "number" &&
    typeof longitude === "number" &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude)
  );
}

export interface MapPickerCoreProps {
  apiKey: string | undefined;
  latitude?: number | null;
  longitude?: number | null;
  defaultCenter?: { lat: number; lng: number };
  radiusMeters: number;
  onLocationChange: (lat: number, lng: number) => void;
  hideGeofence?: boolean;
}

export function MapPicker({
  apiKey,
  latitude,
  longitude,
  defaultCenter,
  radiusMeters,
  onLocationChange,
  hideGeofence = false,
}: MapPickerCoreProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const circleRef = useRef<google.maps.Circle | null>(null);
  const onLocationChangeRef = useRef(onLocationChange);

  const [loadError, setLoadError] = useState(false);
  const [mapReady, setMapReady] = useState(false);

  const safeRadius = clampRadiusMeters(radiusMeters);
  const fallbackLat = defaultCenter?.lat ?? DEFAULT_CENTER.lat;
  const fallbackLng = defaultCenter?.lng ?? DEFAULT_CENTER.lng;

  useEffect(() => {
    onLocationChangeRef.current = onLocationChange;
  }, [onLocationChange]);

  useEffect(() => {
    if (!apiKey || !containerRef.current) return;
    let cancelled = false;
    const el = containerRef.current;

    loadGoogleMapsScript(apiKey)
      .then(() => {
        if (cancelled || !el) return;

        const hasInitial = isValidMapPosition(latitude, longitude);
        const initialCenter = hasInitial
          ? { lat: latitude as number, lng: longitude as number }
          : { lat: fallbackLat, lng: fallbackLng };

        const map = new google.maps.Map(el, {
          center: initialCenter,
          zoom: hasInitial ? 16 : 12,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
        });
        mapRef.current = map;

        const applyPosition = (lat: number, lng: number) => {
          const ll = new google.maps.LatLng(lat, lng);
          markerRef.current?.setPosition(ll);
          circleRef.current?.setCenter(ll);
          onLocationChangeRef.current(lat, lng);
        };

        const createMarkerAndCircle = (lat: number, lng: number) => {
          const ll = new google.maps.LatLng(lat, lng);
          const marker = new google.maps.Marker({
            position: ll,
            map,
            draggable: true,
          });
          markerRef.current = marker;

          marker.addListener("dragend", () => {
            const pos = marker.getPosition();
            if (!pos) return;
            applyPosition(pos.lat(), pos.lng());
          });

          let circle: google.maps.Circle | null = null;
          if (!hideGeofence) {
            circle = new google.maps.Circle({
              map,
              center: ll,
              radius: safeRadius,
              strokeColor: "#2563eb",
              strokeOpacity: 0.9,
              strokeWeight: 2,
              fillColor: "#3b82f6",
              fillOpacity: 0.14,
              clickable: false,
            });
            circleRef.current = circle;
            const b = circle.getBounds();
            if (b) map.fitBounds(b, 16);
          }

          if (!circleRef.current) {
            map.panTo(ll);
          }
        };

        if (hasInitial) {
          createMarkerAndCircle(latitude as number, longitude as number);
        }

        map.addListener("click", (e: google.maps.MapMouseEvent) => {
          if (!e.latLng) return;
          const plat = e.latLng.lat();
          const plng = e.latLng.lng();
          if (!markerRef.current) {
            createMarkerAndCircle(plat, plng);
          }
          applyPosition(plat, plng);
        });

        setMapReady(true);
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      });

    return () => {
      cancelled = true;
      markerRef.current = null;
      circleRef.current = null;
      mapRef.current = null;
      setMapReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- map instance tied to mount; lat/lng synced in following effects
  }, [apiKey]);

  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map) return;

    if (!isValidMapPosition(latitude, longitude)) {
      markerRef.current?.setMap(null);
      circleRef.current?.setMap(null);
      markerRef.current = null;
      circleRef.current = null;
      map.panTo({ lat: fallbackLat, lng: fallbackLng });
      return;
    }

    const lat = latitude as number;
    const lng = longitude as number;
    const pos = new google.maps.LatLng(lat, lng);

    if (!markerRef.current) {
      const marker = new google.maps.Marker({
        position: pos,
        map,
        draggable: true,
      });
      markerRef.current = marker;
      marker.addListener("dragend", () => {
        const p = marker.getPosition();
        if (!p) return;
        onLocationChangeRef.current(p.lat(), p.lng());
      });

      if (!hideGeofence) {
        const circle = new google.maps.Circle({
          map,
          center: pos,
          radius: safeRadius,
          strokeColor: "#2563eb",
          strokeOpacity: 0.9,
          strokeWeight: 2,
          fillColor: "#3b82f6",
          fillOpacity: 0.14,
          clickable: false,
        });
        circleRef.current = circle;
        const b = circle.getBounds();
        if (b) map.fitBounds(b, 16);
      } else {
        map.panTo(pos);
      }
      return;
    }

    markerRef.current.setPosition(pos);
    circleRef.current?.setCenter(pos);
    map.panTo(pos);
  }, [
    mapReady,
    latitude,
    longitude,
    hideGeofence,
    safeRadius,
    fallbackLat,
    fallbackLng,
  ]);

  useEffect(() => {
    const circle = circleRef.current;
    if (!mapReady || !circle) return;
    circle.setRadius(safeRadius);
  }, [mapReady, safeRadius]);

  const showHintPlaced = isValidMapPosition(latitude, longitude);

  if (!apiKey) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <MapPin className="w-4 h-4" />
          <span>Map & geofence</span>
        </div>
        <p className="text-xs text-muted-foreground rounded-md border border-dashed p-4">
          Set{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-[10px]">
            NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
          </code>{" "}
          to use the Google map and preview the claim-radius circle.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {!hideGeofence && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <MapPin className="w-4 h-4" />
          <span>
            {showHintPlaced
              ? "Blue circle is the claim zone. Click the map or drag the pin to move the drop."
              : "Tap the map to place the drop, then drag the pin to adjust. The blue circle is the claim zone."}
          </span>
        </div>
      )}
      <div
        className="relative h-64 w-full rounded-md overflow-hidden border"
        data-testid="map-picker-container"
      >
        <div ref={containerRef} className="h-full w-full min-h-[16rem]" />
        {!mapReady && !loadError && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-muted/40">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}
        {loadError && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted/60 p-4 text-center text-sm text-destructive">
            Could not load Google Maps.
          </div>
        )}
      </div>
    </div>
  );
}
