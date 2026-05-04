import type { Request } from "express";

export function extractDeviceIdFromRequest(request: Request): string | null {
  const headerDeviceId = request.headers["x-device-id"] as string | undefined;
  if (headerDeviceId) {
    return headerDeviceId;
  }
  const queryDeviceId = request.query.deviceId as string | undefined;
  if (queryDeviceId) {
    return queryDeviceId;
  }
  const bodyDeviceId = request.body?.deviceId as string | undefined;
  if (bodyDeviceId) {
    return bodyDeviceId;
  }
  return null;
}
