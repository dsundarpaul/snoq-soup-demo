import { SetMetadata } from "@nestjs/common";
import { AUDIT_ACTION_METADATA_KEY } from "./audit.constants";

export const Audit = (action: string) =>
  SetMetadata(AUDIT_ACTION_METADATA_KEY, action);
