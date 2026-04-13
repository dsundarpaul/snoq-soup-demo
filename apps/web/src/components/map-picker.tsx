"use client";

import { useEffect, useRef, useState } from "react";
import { MapPin, Loader2 } from "lucide-react";
import { loadGoogleMapsScript } from "@/lib/google-maps-script";

function clampRadiusMeters(value: number): number {
  if (!Number.isFinite(value) || value < 5) return 15;
  return Math.min(value, 2000);
}

export interface MapPickerCoreProps {
  apiKey: string | undefined;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  onLocationChange: (lat: number, lng: number) => void;
}

export function MapPicker({
  apiKey,
  latitude,
  longitude,
  radiusMeters,
  onLocationChange,
}: MapPickerCoreProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const circleRef = useRef<google.maps.Circle | null>(null);
  const onLocationChangeRef = useRef(onLocationChange);

  const [loadError, setLoadError] = useState(false);
  const [mapReady, setMapReady] = useState(false);

  const safeRadius = clampRadiusMeters(radiusMeters);

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

        const map = new google.maps.Map(el, {
          center: { lat: latitude, lng: longitude },
          zoom: 16,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
        });
        mapRef.current = map;

        const marker = new google.maps.Marker({
          position: { lat: latitude, lng: longitude },
          map,
          draggable: true,
        });
        markerRef.current = marker;

        const circle = new google.maps.Circle({
          map,
          center: { lat: latitude, lng: longitude },
          radius: safeRadius,
          strokeColor: "#2563eb",
          strokeOpacity: 0.9,
          strokeWeight: 2,
          fillColor: "#3b82f6",
          fillOpacity: 0.14,
          clickable: false,
        });
        circleRef.current = circle;

        const applyPosition = (lat: number, lng: number) => {
          const ll = new google.maps.LatLng(lat, lng);
          marker.setPosition(ll);
          circle.setCenter(ll);
          onLocationChangeRef.current(lat, lng);
        };

        map.addListener("click", (e: google.maps.MapMouseEvent) => {
          if (!e.latLng) return;
          applyPosition(e.latLng.lat(), e.latLng.lng());
        });

        marker.addListener("dragend", () => {
          const pos = marker.getPosition();
          if (!pos) return;
          applyPosition(pos.lat(), pos.lng());
        });

        const b = circle.getBounds();
        if (b) {
          map.fitBounds(b, 16);
        }
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
    const marker = markerRef.current;
    const circle = circleRef.current;
    const map = mapRef.current;
    if (!mapReady || !marker || !circle || !map) return;

    const pos = new google.maps.LatLng(latitude, longitude);
    marker.setPosition(pos);
    circle.setCenter(pos);
    map.panTo(pos);
  }, [mapReady, latitude, longitude]);

  useEffect(() => {
    const circle = circleRef.current;
    if (!mapReady || !circle) return;
    circle.setRadius(safeRadius);
  }, [mapReady, safeRadius]);

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
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <MapPin className="w-4 h-4" />
        <span>
          Blue circle is the claim zone. Click the map or drag the pin to move
          the drop.
        </span>
      </div>
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
