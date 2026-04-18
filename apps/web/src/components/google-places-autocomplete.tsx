"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from "@/components/ui/popover";
import { Loader2, MapPin, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { loadGoogleMapsScript } from "@/lib/google-maps-script";

export type GooglePlaceStructuredAddress = {
  city: string;
  state: string;
  pincode: string;
};

function parsePlaceAddressComponents(
  components: google.maps.GeocoderAddressComponent[] | undefined
): GooglePlaceStructuredAddress {
  const longNameFor = (...types: string[]): string => {
    if (!components?.length) return "";
    for (const t of types) {
      const hit = components.find((c) => c.types.includes(t));
      if (hit?.long_name) return hit.long_name;
    }
    return "";
  };

  const city =
    longNameFor(
      "locality",
      "postal_town",
      "sublocality_level_1",
      "sublocality"
    ) || longNameFor("administrative_area_level_2");

  return {
    city,
    state: longNameFor("administrative_area_level_1"),
    pincode: longNameFor("postal_code"),
  };
}

export interface GooglePlacesAutocompleteProps {
  apiKey: string | undefined;
  onPlaceSelect: (
    lat: number,
    lng: number,
    address: string,
    structured?: GooglePlaceStructuredAddress
  ) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  inputId?: string;
  label?: string;
}

export function GooglePlacesAutocomplete({
  apiKey,
  onPlaceSelect,
  placeholder = "Search for an address or place…",
  className,
  disabled,
  inputId: inputIdProp,
  label = "Search location",
}: GooglePlacesAutocompleteProps) {
  const reactId = useId();
  const inputId = inputIdProp ?? `places-autocomplete-${reactId}`;
  const inputRef = useRef<HTMLInputElement>(null);
  const placesDivRef = useRef<HTMLDivElement>(null);
  const onSelectRef = useRef(onPlaceSelect);
  const blurCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [predictions, setPredictions] = useState<
    google.maps.places.AutocompletePrediction[]
  >([]);
  const [predictLoading, setPredictLoading] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);

  const autoServiceRef = useRef<google.maps.places.AutocompleteService | null>(
    null
  );
  const placesServiceRef = useRef<google.maps.places.PlacesService | null>(
    null
  );
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    onSelectRef.current = onPlaceSelect;
  }, [onPlaceSelect]);

  useEffect(
    () => () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    },
    []
  );

  useEffect(() => {
    if (!apiKey || disabled) return;
    let cancelled = false;

    loadGoogleMapsScript(apiKey)
      .then(() => {
        if (cancelled || !window.google?.maps?.places) return;
        autoServiceRef.current = new google.maps.places.AutocompleteService();
        const el = placesDivRef.current;
        if (el) {
          placesServiceRef.current = new google.maps.places.PlacesService(el);
        }
        setReady(true);
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      });

    return () => {
      cancelled = true;
    };
  }, [apiKey, disabled]);

  const fetchPredictions = useCallback((text: string) => {
    const svc = autoServiceRef.current;
    if (!svc || !text.trim()) {
      setPredictions([]);
      setPredictLoading(false);
      setPopoverOpen(false);
      return;
    }

    setPredictLoading(true);
    svc.getPlacePredictions({ input: text.trim() }, (results, status) => {
      setPredictLoading(false);
      if (
        status !== google.maps.places.PlacesServiceStatus.OK &&
        status !== google.maps.places.PlacesServiceStatus.ZERO_RESULTS
      ) {
        setPredictions([]);
        setPopoverOpen(false);
        return;
      }
      const list = results ?? [];
      setPredictions(list);
      setPopoverOpen(list.length > 0);
    });
  }, []);

  const clearBlurTimer = () => {
    if (blurCloseTimer.current) {
      clearTimeout(blurCloseTimer.current);
      blurCloseTimer.current = null;
    }
  };

  const scheduleClosePopover = () => {
    clearBlurTimer();
    blurCloseTimer.current = setTimeout(() => {
      setPopoverOpen(false);
    }, 180);
  };

  const handleSelectPrediction = useCallback(
    (prediction: google.maps.places.AutocompletePrediction) => {
      clearBlurTimer();
      setPopoverOpen(false);
      setPredictions([]);
      setInputValue(prediction.description);

      const svc = placesServiceRef.current;
      if (!svc) return;

      setDetailsLoading(true);
      svc.getDetails(
        {
          placeId: prediction.place_id,
          fields: [
            "geometry",
            "formatted_address",
            "name",
            "address_components",
          ],
        },
        (place, status) => {
          setDetailsLoading(false);
          if (
            status !== google.maps.places.PlacesServiceStatus.OK ||
            !place?.geometry?.location
          ) {
            return;
          }
          const loc = place.geometry.location;
          const formatted =
            place.formatted_address || place.name || prediction.description;
          const structured = parsePlaceAddressComponents(
            place.address_components
          );
          onSelectRef.current(loc.lat(), loc.lng(), formatted, structured);
        }
      );
    },
    []
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setInputValue(v);
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
      debounceTimer.current = null;
    }
    if (!v.trim()) {
      setPredictions([]);
      setPopoverOpen(false);
      setPredictLoading(false);
      return;
    }
    debounceTimer.current = setTimeout(() => {
      debounceTimer.current = null;
      fetchPredictions(v);
    }, 280);
  };

  const handleInputFocus = () => {
    clearBlurTimer();
    if (predictions.length > 0) setPopoverOpen(true);
  };

  const handleInputBlur = () => {
    scheduleClosePopover();
  };

  if (!apiKey) {
    return (
      <div className={cn("space-y-2", className)}>
        <Label htmlFor={inputId}>{label}</Label>
        <p className="text-xs text-muted-foreground">
          Set{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-[10px]">
            NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
          </code>{" "}
          to enable address search.
        </p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={inputId}>{label}</Label>
      <Popover
        open={popoverOpen}
        onOpenChange={(o) => {
          if (!o) {
            setPopoverOpen(false);
          } else if (predictions.length > 0) {
            setPopoverOpen(true);
          }
        }}
        modal={false}
      >
        <PopoverAnchor asChild>
          <div className="relative w-full">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground z-10" />
            <Input
              ref={inputRef}
              id={inputId}
              type="text"
              autoComplete="off"
              placeholder={placeholder}
              disabled={disabled || detailsLoading}
              value={inputValue}
              onChange={handleInputChange}
              onFocus={handleInputFocus}
              onBlur={handleInputBlur}
              className="pl-9"
              data-testid="input-google-places"
              role="combobox"
              aria-expanded={popoverOpen}
              aria-controls={`${inputId}-places-listbox`}
              aria-autocomplete="list"
            />
            {(predictLoading || detailsLoading) && (
              <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
            )}
            {!ready && !loadError && !predictLoading && (
              <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
            )}
          </div>
        </PopoverAnchor>
        <PopoverContent
          id={`${inputId}-places-listbox`}
          align="start"
          side="bottom"
          sideOffset={6}
          collisionPadding={16}
          className={cn(
            "z-[300] p-0 shadow-lg",
            "w-[var(--radix-popper-anchor-width)] min-w-[min(100%,18rem)] max-w-[min(calc(100vw-2rem),28rem)]"
          )}
          onOpenAutoFocus={(e) => e.preventDefault()}
          onCloseAutoFocus={(e) => e.preventDefault()}
          onInteractOutside={(e) => {
            const t = e.target as Node;
            if (inputRef.current?.contains(t)) {
              e.preventDefault();
            }
          }}
        >
          <ul
            className="max-h-[min(16rem,calc(100vh-12rem))] overflow-y-auto py-1"
            role="listbox"
            aria-label="Place suggestions"
          >
            {predictions.map((p) => (
              <li key={p.place_id} role="presentation">
                <button
                  type="button"
                  role="option"
                  className={cn(
                    "flex w-full items-start gap-2 px-3 py-2.5 text-left text-sm",
                    "hover:bg-accent focus:bg-accent focus:outline-none",
                    "active:bg-accent/90"
                  )}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleSelectPrediction(p)}
                >
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="break-words leading-snug">
                    {p.description}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </PopoverContent>
      </Popover>
      <div
        ref={placesDivRef}
        className="sr-only"
        aria-hidden
        data-testid="google-places-attribution-host"
      />
      {loadError && (
        <p className="text-xs text-destructive">Could not load Google Maps.</p>
      )}
    </div>
  );
}
