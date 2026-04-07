"use client";

import dynamic from "next/dynamic";
import type { MapPickerCoreProps } from "@/components/map-picker";

const MapPickerInner = dynamic<MapPickerCoreProps>(
  () =>
    import("@/components/map-picker").then((mod) => ({ default: mod.MapPicker })),
  {
    ssr: false,
    loading: () => (
      <div
        className="h-full w-full min-h-[16rem] bg-muted/30 rounded-md"
        aria-hidden
      />
    ),
  }
);

export type MapPickerLazyProps = MapPickerCoreProps & {
  remountKey?: number;
};

export function MapPickerLazy({
  remountKey = 0,
  ...rest
}: MapPickerLazyProps) {
  return <MapPickerInner key={remountKey} {...rest} />;
}
