"use client";

import { useState, useEffect } from "react";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  MapPin,
  Loader2,
  X,
  ChevronDown,
  Navigation,
  Check,
} from "lucide-react";
import { GooglePlacesAutocomplete } from "@/components/google-places-autocomplete";
import { MapPickerLazy } from "@/components/map-picker-lazy";
import { useMerchantStoreLocationMutation } from "@/hooks/api/merchant/use-merchant";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { StoreLocation } from "@shared/schema";

interface MerchantStoreLocationSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentLocation: StoreLocation | null | undefined;
}

export function MerchantStoreLocationSheet({
  open,
  onOpenChange,
  currentLocation,
}: MerchantStoreLocationSheetProps) {
  const { toast } = useToast();
  const [lat, setLat] = useState(currentLocation?.lat ?? 24.7136);
  const [lng, setLng] = useState(currentLocation?.lng ?? 46.6753);
  const [address, setAddress] = useState(currentLocation?.address ?? "");
  const [city, setCity] = useState(currentLocation?.city ?? "");
  const [state, setState] = useState(currentLocation?.state ?? "");
  const [pincode, setPincode] = useState(currentLocation?.pincode ?? "");
  const [landmark, setLandmark] = useState(currentLocation?.landmark ?? "");
  const [howToReach, setHowToReach] = useState(
    currentLocation?.howToReach ?? ""
  );
  const [coordsOpen, setCoordsOpen] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [mapKey, setMapKey] = useState(0);

  useEffect(() => {
    if (!open) return;
    setLat(currentLocation?.lat ?? 24.7136);
    setLng(currentLocation?.lng ?? 46.6753);
    setAddress(currentLocation?.address ?? "");
    setCity(currentLocation?.city ?? "");
    setState(currentLocation?.state ?? "");
    setPincode(currentLocation?.pincode ?? "");
    setLandmark(currentLocation?.landmark ?? "");
    setHowToReach(currentLocation?.howToReach ?? "");
    setMapKey((k) => k + 1);
  }, [open, currentLocation]);

  const mutation = useMerchantStoreLocationMutation({
    onSuccess: () => {
      toast({ title: "Store location saved!" });
      onOpenChange(false);
    },
    onError: () => {
      toast({ title: "Failed to save location", variant: "destructive" });
    },
  });

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast({
        title: "Location not supported",
        variant: "destructive",
      });
      return;
    }
    setIsGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLat(parseFloat(position.coords.latitude.toFixed(6)));
        setLng(parseFloat(position.coords.longitude.toFixed(6)));
        setMapKey((k) => k + 1);
        setIsGettingLocation(false);
        toast({ title: "Current location detected" });
      },
      () => {
        setIsGettingLocation(false);
        toast({
          title: "Could not get location",
          variant: "destructive",
        });
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  const handlePlaceSelect = (
    newLat: number,
    newLng: number,
    addr: string
  ) => {
    setLat(parseFloat(newLat.toFixed(6)));
    setLng(parseFloat(newLng.toFixed(6)));
    setMapKey((k) => k + 1);

    const parts = addr.split(",").map((s) => s.trim());
    setAddress(addr);
    if (parts.length >= 2) {
      setCity(parts[parts.length - 2] ?? "");
    }
    if (parts.length >= 1) {
      setState(parts[parts.length - 1] ?? "");
    }
  };

  const handleSave = () => {
    const payload: Record<string, unknown> = { lat, lng };
    if (address.trim()) payload.address = address.trim();
    if (city.trim()) payload.city = city.trim();
    if (state.trim()) payload.state = state.trim();
    if (pincode.trim()) payload.pincode = pincode.trim();
    if (landmark.trim()) payload.landmark = landmark.trim();
    if (howToReach.trim()) payload.howToReach = howToReach.trim();

    mutation.mutate({
      storeLocation: payload as {
        lat: number;
        lng: number;
        address?: string;
        city?: string;
        state?: string;
        pincode?: string;
        landmark?: string;
        howToReach?: string;
      },
    });
  };

  const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        showClose={false}
        side="right"
        className="flex h-full max-h-[100dvh] w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-xl"
      >
        <SheetHeader className="sticky top-0 z-10 shrink-0 space-y-1 border-b bg-background px-6 pb-4 pt-6 text-left">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1 space-y-1.5">
              <SheetTitle className="flex items-center gap-2 text-left">
                <MapPin className="h-5 w-5 shrink-0 text-primary" />
                Set Store Location
              </SheetTitle>
              <SheetDescription>
                Set your store's physical location so customers can find you
                after claiming a voucher.
              </SheetDescription>
            </div>
            <SheetClose asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="shrink-0"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </Button>
            </SheetClose>
          </div>
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4 space-y-4">
          <div className="space-y-2">
            <Label>Search for your store</Label>
            <GooglePlacesAutocomplete
              apiKey={googleMapsApiKey}
              onPlaceSelect={handlePlaceSelect}
              placeholder="Type your store address…"
              label=""
            />
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full gap-2"
            onClick={handleUseCurrentLocation}
            disabled={isGettingLocation}
          >
            {isGettingLocation ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Navigation className="h-4 w-4" />
            )}
            Use my current location
          </Button>

          <MapPickerLazy
            remountKey={mapKey}
            apiKey={googleMapsApiKey}
            latitude={lat}
            longitude={lng}
            radiusMeters={50}
            hideGeofence
            onLocationChange={(newLat, newLng) => {
              setLat(parseFloat(newLat.toFixed(6)));
              setLng(parseFloat(newLng.toFixed(6)));
            }}
          />

          <Collapsible open={coordsOpen} onOpenChange={setCoordsOpen}>
            <CollapsibleTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="gap-1 px-0 text-muted-foreground"
              >
                <ChevronDown
                  className={cn(
                    "h-4 w-4 transition-transform",
                    coordsOpen && "rotate-180"
                  )}
                />
                Enter coordinates manually
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-3 pt-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="store-lat">Latitude</Label>
                  <Input
                    id="store-lat"
                    type="number"
                    step="any"
                    value={lat}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value);
                      if (!Number.isNaN(v)) {
                        setLat(v);
                        setMapKey((k) => k + 1);
                      }
                    }}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="store-lng">Longitude</Label>
                  <Input
                    id="store-lng"
                    type="number"
                    step="any"
                    value={lng}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value);
                      if (!Number.isNaN(v)) {
                        setLng(v);
                        setMapKey((k) => k + 1);
                      }
                    }}
                  />
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          <div className="space-y-3 border-t pt-4">
            <p className="text-sm font-medium">Address details</p>
            <div className="space-y-1">
              <Label htmlFor="store-address">Address</Label>
              <Input
                id="store-address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Street address"
                maxLength={200}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="store-city">City</Label>
                <Input
                  id="store-city"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="City"
                  maxLength={100}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="store-state">State</Label>
                <Input
                  id="store-state"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  placeholder="State / Province"
                  maxLength={100}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="store-pincode">Pincode</Label>
              <Input
                id="store-pincode"
                value={pincode}
                onChange={(e) => setPincode(e.target.value)}
                placeholder="Postal / ZIP code"
                maxLength={20}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="store-landmark">Landmark</Label>
              <Input
                id="store-landmark"
                value={landmark}
                onChange={(e) => setLandmark(e.target.value)}
                placeholder="Near any landmark?"
                maxLength={150}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="store-howtoreach">How to reach</Label>
              <Textarea
                id="store-howtoreach"
                value={howToReach}
                onChange={(e) => setHowToReach(e.target.value)}
                placeholder="Directions or tips to find your store"
                rows={2}
                maxLength={300}
              />
            </div>
          </div>
        </div>

        <SheetFooter className="sticky bottom-0 z-10 shrink-0 flex-col gap-2 border-t bg-background px-6 py-4 sm:flex-row sm:justify-start sm:space-x-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            className="sm:flex-1 gap-2"
            onClick={handleSave}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Check className="h-4 w-4" />
            )}
            Save Location
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
