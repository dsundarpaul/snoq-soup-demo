"use client";

import { useState, useCallback } from "react";
import Cropper, { Area } from "react-easy-crop";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Loader2, ZoomIn, RotateCw, AlertCircle } from "lucide-react";

interface ImageCropperProps {
  imageSrc: string;
  open: boolean;
  onClose: () => void;
  onCropComplete: (croppedImageBlob: Blob) => void;
  aspectRatio?: number;
  cropShape?: "rect" | "round";
}

async function getCroppedImg(imageSrc: string, pixelCrop: Area, rotation: number = 0): Promise<Blob> {
  const image = new Image();
  image.src = imageSrc;
  await new Promise((resolve, reject) => {
    image.onload = resolve;
    image.onerror = reject;
  });

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No 2d context");

  const rotRad = (rotation * Math.PI) / 180;

  const bBoxWidth = Math.abs(Math.cos(rotRad) * image.width) + Math.abs(Math.sin(rotRad) * image.height);
  const bBoxHeight = Math.abs(Math.sin(rotRad) * image.width) + Math.abs(Math.cos(rotRad) * image.height);

  canvas.width = bBoxWidth;
  canvas.height = bBoxHeight;

  ctx.translate(bBoxWidth / 2, bBoxHeight / 2);
  ctx.rotate(rotRad);
  ctx.translate(-image.width / 2, -image.height / 2);
  ctx.drawImage(image, 0, 0);

  const data = ctx.getImageData(pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height);

  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  ctx.putImageData(data, 0, 0);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Canvas toBlob failed"));
      },
      "image/png",
      1
    );
  });
}

export function ImageCropper({
  imageSrc,
  open,
  onClose,
  onCropComplete,
  aspectRatio = 1,
  cropShape = "rect",
}: ImageCropperProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const onCropChange = useCallback((location: { x: number; y: number }) => {
    setCrop(location);
  }, []);

  const onZoomChange = useCallback((newZoom: number) => {
    setZoom(newZoom);
  }, []);

  const onCropCompleteCallback = useCallback((_: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleSave = async () => {
    if (!croppedAreaPixels) return;
    
    setIsProcessing(true);
    setErrorMessage(null);
    try {
      const croppedBlob = await getCroppedImg(imageSrc, croppedAreaPixels, rotation);
      onCropComplete(croppedBlob);
      onClose();
    } catch (error) {
      console.error("Error cropping image:", error);
      setErrorMessage("Failed to crop image. Please try again or select a different image.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancel = () => {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setRotation(0);
    setErrorMessage(null);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleCancel()}>
      <DialogContent className="w-[95vw] max-w-md mx-auto p-4">
        <DialogHeader>
          <DialogTitle className="text-lg">Crop Your Logo</DialogTitle>
        </DialogHeader>
        
        <div className="relative w-full aspect-square bg-muted rounded-lg overflow-hidden touch-none">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            rotation={rotation}
            aspect={aspectRatio}
            cropShape={cropShape}
            onCropChange={onCropChange}
            onZoomChange={onZoomChange}
            onCropComplete={onCropCompleteCallback}
          />
        </div>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-sm">
              <ZoomIn className="w-4 h-4" />
              Zoom
            </Label>
            <Slider
              value={[zoom]}
              min={1}
              max={3}
              step={0.1}
              onValueChange={(values) => setZoom(values[0])}
              className="touch-none"
              data-testid="slider-zoom"
            />
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-sm">
              <RotateCw className="w-4 h-4" />
              Rotate
            </Label>
            <div className="flex items-center gap-2">
              <Button 
                type="button" 
                variant="outline" 
                size="sm"
                onClick={() => setRotation((r) => (r - 90 + 360) % 360)}
                data-testid="button-rotate-left"
              >
                -90°
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                size="sm"
                onClick={() => setRotation((r) => (r + 90) % 360)}
                data-testid="button-rotate-right"
              >
                +90°
              </Button>
              <span className="text-sm text-muted-foreground ml-auto">{rotation}°</span>
            </div>
          </div>
        </div>

        {errorMessage && (
          <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/30 rounded-lg">
            <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0" />
            <p className="text-sm text-destructive">{errorMessage}</p>
          </div>
        )}

        <div className="flex flex-col gap-2 pt-2">
          <Button onClick={handleSave} disabled={isProcessing} className="w-full" data-testid="button-save-crop">
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              "Save & Upload"
            )}
          </Button>
          <Button variant="outline" onClick={handleCancel} className="w-full" data-testid="button-cancel-crop">
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
