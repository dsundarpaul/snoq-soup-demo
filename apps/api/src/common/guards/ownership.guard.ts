import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { Request } from "express";
import { DatabaseService } from "../../database/database.service";
import { Types } from "mongoose";

interface RequestWithUser extends Request {
  user: {
    userId: string;
    email: string;
    role: string;
  };
  params: {
    id?: string;
    dropId?: string;
    promoCodeId?: string;
    voucherId?: string;
    merchantId?: string;
  };
}

type ResourceType = "drop" | "promoCode" | "voucher" | "merchant";

@Injectable()
export class OwnershipGuard implements CanActivate {
  constructor(private readonly databaseService: DatabaseService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException("User not authenticated");
    }

    // Determine resource type and ID from route parameters
    const { resourceType, resourceId } = this.getResourceInfo(request);

    if (!resourceType || !resourceId) {
      // No resource to check ownership for, allow access
      return true;
    }

    // Validate ObjectId format
    if (!Types.ObjectId.isValid(resourceId)) {
      throw new NotFoundException(`${resourceType} not found`);
    }

    const isOwner = await this.checkOwnership(
      resourceType,
      resourceId,
      user.userId,
      user.role,
    );

    if (!isOwner) {
      throw new ForbiddenException(
        "You do not have permission to access this resource",
      );
    }

    return true;
  }

  private getResourceInfo(request: RequestWithUser): {
    resourceType: ResourceType | null;
    resourceId: string | null;
  } {
    const params = request.params;

    if (params.id) {
      // Try to infer from URL path
      const path = request.path;
      if (path.includes("/drops/"))
        return { resourceType: "drop", resourceId: params.id };
      if (path.includes("/promo-codes/"))
        return { resourceType: "promoCode", resourceId: params.id };
      if (path.includes("/vouchers/"))
        return { resourceType: "voucher", resourceId: params.id };
      if (path.includes("/merchants/"))
        return { resourceType: "merchant", resourceId: params.id };
    }

    if (params.dropId)
      return { resourceType: "drop", resourceId: params.dropId };
    if (params.promoCodeId)
      return { resourceType: "promoCode", resourceId: params.promoCodeId };
    if (params.voucherId)
      return { resourceType: "voucher", resourceId: params.voucherId };
    if (params.merchantId)
      return { resourceType: "merchant", resourceId: params.merchantId };

    return { resourceType: null, resourceId: null };
  }

  private async checkOwnership(
    resourceType: ResourceType,
    resourceId: string,
    userId: string,
    userRole: string,
  ): Promise<boolean> {
    void userRole; // Intentionally unused - reserved for future role-based ownership
    const objectId = new Types.ObjectId(resourceId);

    switch (resourceType) {
      case "drop": {
        const drop = await this.databaseService.drops.findById(objectId);
        if (!drop) throw new NotFoundException("Drop not found");

        // Drops owned by merchant
        if (drop.merchantId) {
          return drop.merchantId.toString() === userId;
        }
        return false;
      }

      case "promoCode": {
        const promoCode =
          await this.databaseService.promoCodes.findById(objectId);
        if (!promoCode) throw new NotFoundException("Promo code not found");

        // Promo codes owned by merchant
        if (promoCode.merchantId) {
          return promoCode.merchantId.toString() === userId;
        }
        return false;
      }

      case "voucher": {
        const voucher = await this.databaseService.vouchers.findById(objectId);
        if (!voucher) throw new NotFoundException("Voucher not found");

        // Vouchers owned by hunter or merchant
        if (voucher.claimedBy?.hunterId) {
          return voucher.claimedBy.hunterId.toString() === userId;
        }
        if (voucher.merchantId) {
          return voucher.merchantId.toString() === userId;
        }
        return false;
      }

      case "merchant": {
        // Merchants own themselves
        return resourceId === userId;
      }

      default:
        return false;
    }
  }
}
