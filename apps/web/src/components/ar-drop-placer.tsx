"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { MapPin, Camera, Check, X, Loader2, Compass, Navigation } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

interface ARDropPlacerProps {
  open: boolean;
  onClose: () => void;
  onPlaceConfirm: (latitude: number, longitude: number) => void;
}

function calculateOffsetCoordinates(
  lat: number,
  lon: number,
  distanceMeters: number,
  headingDegrees: number
): { lat: number; lon: number } {
  const R = 6371000;
  const headingRad = (headingDegrees * Math.PI) / 180;
  const latRad = (lat * Math.PI) / 180;
  const lonRad = (lon * Math.PI) / 180;

  const newLatRad = Math.asin(
    Math.sin(latRad) * Math.cos(distanceMeters / R) +
    Math.cos(latRad) * Math.sin(distanceMeters / R) * Math.cos(headingRad)
  );

  const newLonRad = lonRad + Math.atan2(
    Math.sin(headingRad) * Math.sin(distanceMeters / R) * Math.cos(latRad),
    Math.cos(distanceMeters / R) - Math.sin(latRad) * Math.sin(newLatRad)
  );

  return {
    lat: parseFloat(((newLatRad * 180) / Math.PI).toFixed(6)),
    lon: parseFloat(((newLonRad * 180) / Math.PI).toFixed(6)),
  };
}

export function ARDropPlacer({ open, onClose, onPlaceConfirm }: ARDropPlacerProps) {
  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [gpsStatus, setGpsStatus] = useState<"loading" | "success" | "error">("loading");
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [distance, setDistance] = useState(5);
  const [heading, setHeading] = useState<number | null>(null);
  const [compassStatus, setCompassStatus] = useState<"idle" | "requesting" | "active" | "unsupported" | "denied">("idle");
  const headingRef = useRef<number | null>(null);
  const listenerAttached = useRef(false);

  const startCamera = async () => {
    try {
      setCameraError(null);
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error("Camera error:", err);
      const errorMsg = "Could not access camera. Please allow camera permissions.";
      setCameraError(errorMsg);
      toast({
        title: "Camera Error",
        description: errorMsg,
        variant: "destructive",
      });
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  };

  const handleDeviceOrientation = useCallback((event: DeviceOrientationEvent) => {
    if (event.alpha !== null) {
      let compassHeading = event.alpha;
      if ((event as any).webkitCompassHeading !== undefined) {
        compassHeading = (event as any).webkitCompassHeading;
      } else {
        compassHeading = 360 - event.alpha;
      }
      const rounded = Math.round(compassHeading);
      headingRef.current = rounded;
      setHeading(rounded);
      setCompassStatus("active");
    }
  }, []);

  const requestCompassPermission = async () => {
    setCompassStatus("requesting");
    
    if (typeof DeviceOrientationEvent === "undefined") {
      setCompassStatus("unsupported");
      setHeading(0);
      headingRef.current = 0;
      toast({
        title: "Compass Not Available",
        description: "Using North as default direction.",
      });
      return;
    }

    if (typeof (DeviceOrientationEvent as any).requestPermission === "function") {
      try {
        const permission = await (DeviceOrientationEvent as any).requestPermission();
        if (permission === "granted") {
          window.addEventListener("deviceorientation", handleDeviceOrientation, true);
          listenerAttached.current = true;
          setTimeout(() => {
            if (headingRef.current === null) {
              setCompassStatus("unsupported");
              setHeading(0);
              headingRef.current = 0;
            }
          }, 3000);
        } else {
          setCompassStatus("denied");
          setHeading(0);
          headingRef.current = 0;
          toast({
            title: "Compass Permission Denied",
            description: "Using North as default direction.",
            variant: "destructive",
          });
        }
      } catch (err) {
        console.error("Compass permission error:", err);
        setCompassStatus("unsupported");
        setHeading(0);
        headingRef.current = 0;
      }
    } else {
      window.addEventListener("deviceorientation", handleDeviceOrientation, true);
      listenerAttached.current = true;
      setTimeout(() => {
        if (headingRef.current === null) {
          setCompassStatus("unsupported");
          setHeading(0);
          headingRef.current = 0;
          toast({
            title: "Compass Not Detected",
            description: "Using North as default direction.",
          });
        }
      }, 3000);
    }
  };

  const stopCompass = () => {
    if (listenerAttached.current) {
      window.removeEventListener("deviceorientation", handleDeviceOrientation, true);
      listenerAttached.current = false;
    }
  };

  const getGPSLocation = () => {
    setGpsStatus("loading");
    setGpsError(null);
    
    if (!navigator.geolocation) {
      setGpsStatus("error");
      setGpsError("GPS not supported on this device");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCurrentLocation({
          lat: parseFloat(position.coords.latitude.toFixed(6)),
          lon: parseFloat(position.coords.longitude.toFixed(6)),
        });
        setGpsStatus("success");
      },
      (error) => {
        setGpsStatus("error");
        let errorMsg = "Could not get location. Please try again.";
        if (error.code === 1) {
          errorMsg = "Location permission denied. Please allow location access.";
        } else if (error.code === 2) {
          errorMsg = "Location unavailable. Check GPS/network.";
        }
        setGpsError(errorMsg);
        toast({
          title: "Location Error",
          description: errorMsg,
          variant: "destructive",
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );
  };

  useEffect(() => {
    if (open) {
      void startCamera();
      getGPSLocation();
    }

    return () => {
      stopCamera();
      stopCompass();
    };
  }, [open]);

  const getTargetLocation = () => {
    if (!currentLocation || heading === null) return null;
    return calculateOffsetCoordinates(currentLocation.lat, currentLocation.lon, distance, heading);
  };

  const handleConfirm = () => {
    const target = getTargetLocation();
    if (target) {
      onPlaceConfirm(target.lat, target.lon);
      stopCamera();
      stopCompass();
      onClose();
    }
  };

  const handleClose = () => {
    stopCamera();
    stopCompass();
    onClose();
  };

  const targetLocation = getTargetLocation();
  const isReady = gpsStatus === "success" && currentLocation && heading !== null;
  const compassNeedsSetup = compassStatus === "idle";
  const compassWorking = compassStatus === "active";
  const compassFallback = compassStatus === "unsupported" || compassStatus === "denied";

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="max-w-lg p-0 overflow-hidden sm:max-w-lg max-h-[95vh] flex flex-col">
        <DialogHeader className="p-4 pb-2 shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Camera className="w-5 h-5" />
            Place Drop with Camera
          </DialogTitle>
        </DialogHeader>
        
        <div className="relative w-full flex-1 min-h-[250px] max-h-[50vh] bg-black">
          {cameraError ? (
            <div className="absolute inset-0 flex items-center justify-center bg-muted">
              <div className="text-center p-4">
                <Camera className="w-12 h-12 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">{cameraError}</p>
                <Button variant="outline" size="sm" className="mt-2" onClick={startCamera}>
                  Try Again
                </Button>
              </div>
            </div>
          ) : (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="absolute inset-0 w-full h-full object-cover"
              data-testid="ar-placer-video"
            />
          )}
          
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            {/* Container moves up based on distance - further = higher on screen (toward horizon) */}
            <div 
              className="relative flex flex-col items-center transition-all duration-300"
              style={{ 
                transform: `translateY(${20 - (distance - 2) * 15}px)`,
              }}
            >
              {/* Distance indicator above coin */}
              <div className="mb-2 px-3 py-1 bg-black/70 rounded-full backdrop-blur">
                <span className="text-white text-sm font-bold">{distance}m ahead</span>
              </div>
              
              {/* Coin preview - scales based on distance (farther = smaller) */}
              <div 
                className="relative transition-transform duration-300"
                style={{ 
                  transform: `scale(${1.4 - (distance - 2) * 0.08})`,
                }}
              >
                <div className="w-24 h-24 rounded-full border-2 border-white/50 flex items-center justify-center">
                  <div className="w-14 h-14 rounded-full bg-teal-500 border-4 border-teal-400 shadow-lg flex items-center justify-center animate-pulse">
                    <div className="w-7 h-7 rounded-full bg-purple-600 shadow-inner" />
                  </div>
                </div>
                {/* Crosshair lines */}
                <div className="absolute top-1/2 -left-4 w-[calc(100%+2rem)] h-0.5 bg-white/40 -translate-y-1/2" />
                <div className="absolute left-1/2 -top-4 h-[calc(100%+2rem)] w-0.5 bg-white/40 -translate-x-1/2" />
              </div>
              
              {/* Drop zone indicator */}
              <div className="mt-2 px-2 py-0.5 bg-teal-500/80 rounded text-xs text-white font-medium">
                Drop Zone
              </div>
            </div>
          </div>
          
          <div className="absolute top-3 left-3 right-3">
            <Card className="p-2 bg-background/90 backdrop-blur">
              <div className="flex items-center gap-2 text-xs">
                {gpsStatus === "loading" ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin text-primary" />
                    <span>Getting GPS...</span>
                  </>
                ) : gpsStatus === "success" ? (
                  <>
                    <MapPin className="w-3 h-3 text-green-500" />
                    <span className="text-green-600">GPS Ready</span>
                  </>
                ) : (
                  <>
                    <X className="w-3 h-3 text-destructive" />
                    <span className="text-destructive truncate">{gpsError}</span>
                    <Button variant="ghost" size="sm" className="h-6 px-2" onClick={getGPSLocation}>
                      Retry
                    </Button>
                  </>
                )}
                <span className="text-muted-foreground">|</span>
                {compassWorking && heading !== null ? (
                  <>
                    <Compass className="w-3 h-3 text-blue-500" />
                    <span>{heading}°</span>
                  </>
                ) : compassStatus === "requesting" ? (
                  <>
                    <Compass className="w-3 h-3 animate-spin text-muted-foreground" />
                    <span>Enabling...</span>
                  </>
                ) : compassFallback ? (
                  <>
                    <Compass className="w-3 h-3 text-amber-500" />
                    <span className="text-amber-600">North (0°)</span>
                  </>
                ) : (
                  <span className="text-muted-foreground">Compass off</span>
                )}
              </div>
            </Card>
          </div>
          
          <div className="absolute bottom-3 left-3 right-3 text-center">
            <p className="text-white text-xs bg-black/60 rounded-full px-3 py-1.5 inline-block backdrop-blur">
              <Navigation className="w-3 h-3 inline mr-1" />
              Point camera toward drop location
            </p>
          </div>
        </div>
        
        <div className="p-4 space-y-3 shrink-0 border-t">
          {compassNeedsSetup && (
            <Button 
              variant="outline" 
              className="w-full" 
              onClick={requestCompassPermission}
              data-testid="button-enable-compass"
            >
              <Compass className="w-4 h-4 mr-2" />
              Enable Compass for Direction
            </Button>
          )}
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Distance ahead</span>
              <span className="text-sm font-bold text-primary">{distance}m</span>
            </div>
            <Slider
              value={[distance]}
              onValueChange={(value) => setDistance(value[0])}
              min={2}
              max={10}
              step={1}
              className="w-full"
              data-testid="slider-distance"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>2m</span>
              <span>10m</span>
            </div>
          </div>
          
          {targetLocation && (
            <div className="text-xs text-center text-muted-foreground bg-muted rounded p-2">
              Drop location: {targetLocation.lat}, {targetLocation.lon}
            </div>
          )}
          
          {compassFallback && (
            <div className="text-xs text-center text-amber-600 bg-amber-50 dark:bg-amber-900/30 rounded p-2">
              Compass unavailable - drop will be placed {distance}m North of your position
            </div>
          )}
        </div>
        
        <div className="p-4 pt-0 flex gap-2 shrink-0">
          <Button variant="outline" className="flex-1" onClick={handleClose} data-testid="button-cancel-ar-placement">
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
          <Button 
            className="flex-1" 
            onClick={handleConfirm}
            disabled={!isReady}
            data-testid="button-confirm-ar-placement"
          >
            <Check className="w-4 h-4 mr-2" />
            Place Drop
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
