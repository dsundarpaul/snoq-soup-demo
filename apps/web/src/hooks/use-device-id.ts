import { useState, useEffect } from "react";

const DEVICE_ID_KEY = "souq-snap-device-id";

function generateDeviceId(): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 15);
  return `device_${timestamp}_${randomPart}`;
}

export function useDeviceId() {
  const [deviceId, setDeviceId] = useState<string>("");

  useEffect(() => {
    let id = localStorage.getItem(DEVICE_ID_KEY);
    if (!id) {
      id = generateDeviceId();
      localStorage.setItem(DEVICE_ID_KEY, id);
    }
    setDeviceId(id);
  }, []);

  return deviceId;
}

export function getDeviceId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = generateDeviceId();
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}
