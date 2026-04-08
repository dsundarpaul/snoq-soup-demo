import {
  Injectable,
  CanActivate,
  ExecutionContext,
  BadRequestException,
} from "@nestjs/common";
import { Request } from "express";
import { DatabaseService } from "../../database/database.service";

interface RequestWithDevice extends Request {
  deviceId?: string;
  hunterId?: string;
  user?: {
    userId: string;
    email: string;
    role: string;
    deviceId?: string;
    hunterId?: string;
  };
}

@Injectable()
export class DeviceGuard implements CanActivate {
  constructor(private readonly databaseService: DatabaseService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithDevice>();

    // Extract deviceId from various sources
    const deviceId = this.extractDeviceId(request);

    if (!deviceId) {
      throw new BadRequestException(
        "Device ID is required. Provide via X-Device-Id header, deviceId query param, or request body.",
      );
    }

    // Validate deviceId format (should be a string with reasonable length)
    if (
      typeof deviceId !== "string" ||
      deviceId.length < 3 ||
      deviceId.length > 255
    ) {
      throw new BadRequestException("Invalid device ID format");
    }

    // Try to find existing hunter by deviceId
    let hunter = await this.databaseService.hunters.findOne({ deviceId });

    // Auto-create hunter if not found
    if (!hunter) {
      hunter = await this.databaseService.hunters.create({
        deviceId,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    // Attach deviceId and hunterId to request for later use
    request.deviceId = deviceId;
    request.hunterId = hunter._id.toString();

    // Also attach to user object if it exists
    if (request.user) {
      request.user.deviceId = deviceId;
      request.user.hunterId = hunter._id.toString();
    }

    return true;
  }

  private extractDeviceId(request: Request): string | null {
    // Check X-Device-Id header (preferred)
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

    return null;
  }
}
