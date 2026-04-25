import { applyDecorators, SetMetadata, UseGuards } from "@nestjs/common";
import {
  DROP_ID_PARAM_KEY,
  DropOwnershipGuard,
} from "../guards/drop-ownership.guard";

export const VerifyDropOwnership = (paramName = "dropId") =>
  applyDecorators(
    SetMetadata(DROP_ID_PARAM_KEY, paramName),
    UseGuards(DropOwnershipGuard),
  );
