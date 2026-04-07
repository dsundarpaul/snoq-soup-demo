import { useEffect, useRef } from "react";

interface ARSceneProps {
  targetLat: number;
  targetLon: number;
  onLoad?: () => void;
}

export function ARScene({ targetLat, targetLon, onLoad }: ARSceneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const loadARScripts = async () => {
      if (typeof window !== "undefined" && !document.querySelector('script[src*="aframe"]')) {
        const aframeScript = document.createElement("script");
        aframeScript.src = "https://aframe.io/releases/1.4.0/aframe.min.js";
        aframeScript.async = true;
        document.head.appendChild(aframeScript);

        await new Promise((resolve) => {
          aframeScript.onload = resolve;
        });

        const arjsScript = document.createElement("script");
        arjsScript.src = "https://raw.githack.com/AR-js-org/AR.js/master/aframe/build/aframe-ar-nft.js";
        arjsScript.async = true;
        document.head.appendChild(arjsScript);

        await new Promise((resolve) => {
          arjsScript.onload = resolve;
        });
      }

      onLoad?.();
    };

    loadARScripts();
  }, [onLoad]);

  useEffect(() => {
    if (!containerRef.current) return;

    const arHtml = `
      <a-scene
        vr-mode-ui="enabled: false"
        arjs="sourceType: webcam; videoTexture: true; debugUIEnabled: false;"
        renderer="antialias: true; alpha: true"
      >
        <a-entity
          gps-camera="simulateLatitude: ${targetLat}; simulateLongitude: ${targetLon}"
          rotation-reader
        ></a-entity>
        
        <a-entity
          gps-entity-place="latitude: ${targetLat}; longitude: ${targetLon}"
          scale="0.5 0.5 0.5"
        >
          <a-entity
            geometry="primitive: cylinder; radius: 0.3; height: 0.5"
            material="color: #14B8A6; metalness: 0.8; roughness: 0.2"
            position="0 0.25 0"
            animation="property: rotation; to: 0 360 0; loop: true; dur: 4000; easing: linear"
          ></a-entity>
          <a-entity
            geometry="primitive: torus; radius: 0.35; radiusTubular: 0.05"
            material="color: #14B8A6; metalness: 0.9; roughness: 0.1"
            position="0 0.7 0"
            rotation="90 0 0"
          ></a-entity>
          <a-entity
            geometry="primitive: sphere; radius: 0.15"
            material="color: #7C3AED; emissive: #7C3AED; emissiveIntensity: 0.5"
            position="0 1 0"
            animation="property: position; to: 0 1.2 0; dir: alternate; loop: true; dur: 1000; easing: easeInOutQuad"
          ></a-entity>
        </a-entity>

        <a-light type="ambient" color="#ffffff" intensity="0.8"></a-light>
        <a-light type="directional" color="#ffffff" intensity="0.6" position="1 1 1"></a-light>
      </a-scene>
    `;

    containerRef.current.innerHTML = arHtml;

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = "";
      }
    };
  }, [targetLat, targetLon]);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 z-0"
      data-testid="ar-scene-container"
    />
  );
}

export function ARFallback() {
  return (
    <div className="absolute inset-0 bg-gradient-to-b from-slate-900 via-primary/20 to-slate-900 flex items-center justify-center">
      <div className="relative">
        <div className="w-32 h-32 rounded-full bg-teal/20 animate-ping absolute inset-0" />
        <div className="w-32 h-32 rounded-full bg-teal/30 flex items-center justify-center relative">
          <svg className="w-16 h-16 text-teal" viewBox="0 0 24 24" fill="currentColor">
            <path d="M5 3h14l-1.5 6H6.5L5 3zm2.5 8h9l-1 4H8.5l-1-4zm2 6h5l-.5 2h-4l-.5-2zm3.5-14v2m-2-2v2m4-2v2"/>
            <path d="M5 3c-.5 0-1 .5-1 1l1.5 6h13l1.5-6c0-.5-.5-1-1-1H5z"/>
          </svg>
        </div>
      </div>
    </div>
  );
}
