import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { Request } from "express";

export const DeviceId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string | null => {
    const request = ctx.switchToHttp().getRequest<Request>();

    // Check headers first
    const headerDeviceId = request.headers["x-device-id"] as string | undefined;
    if (headerDeviceId) {
      return headerDeviceId;
    }

    // Check query params
    const queryDeviceId = request.query.deviceId as string | undefined;
    if (queryDeviceId) {
      return queryDeviceId;
    }

    // Check body
    const bodyDeviceId = request.body?.deviceId as string | undefined;
    if (bodyDeviceId) {
      return bodyDeviceId;
    }

    // Check user from JWT
    const user = request.user as { deviceId?: string } | undefined;
    if (user?.deviceId) {
      return user.deviceId;
    }

    return null;
  },
);
