"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapPin } from "lucide-react";

const customIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

export interface MapPickerCoreProps {
  latitude: number;
  longitude: number;
  onLocationChange: (lat: number, lng: number) => void;
}

export function MapPicker({
  latitude,
  longitude,
  onLocationChange,
}: MapPickerCoreProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const onLocationChangeRef = useRef(onLocationChange);

  useEffect(() => {
    onLocationChangeRef.current = onLocationChange;
  }, [onLocationChange]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || mapRef.current) return;

    const map = L.map(el, { scrollWheelZoom: true }).setView(
      [latitude, longitude] as L.LatLngTuple,
      14
    );
    mapRef.current = map;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    const marker = L.marker([latitude, longitude], {
      icon: customIcon,
    }).addTo(map);
    markerRef.current = marker;

    const onClick = (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      marker.setLatLng([lat, lng]);
      onLocationChangeRef.current(lat, lng);
    };
    map.on("click", onClick);

    return () => {
      map.off("click", onClick);
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- one L.map per mount; position from props below

  useEffect(() => {
    const map = mapRef.current;
    const marker = markerRef.current;
    if (!map || !marker) return;
    const next: L.LatLngTuple = [latitude, longitude];
    marker.setLatLng(next);
    map.setView(next, map.getZoom());
  }, [latitude, longitude]);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <MapPin className="w-4 h-4" />
        <span>Click on the map to set drop location</span>
      </div>
      <div
        className="h-64 w-full rounded-md overflow-hidden border"
        data-testid="map-picker-container"
      >
        <div ref={containerRef} className="h-full w-full min-h-[16rem]" />
      </div>
    </div>
  );
}
