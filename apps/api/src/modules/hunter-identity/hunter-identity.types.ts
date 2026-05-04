import { Types } from "mongoose";

export type HunterClaimResolutionSource = "jwt" | "device";

export type HunterClaimIdentity = {
  hunterObjectId: Types.ObjectId;
  hunterEmailTrimmed: string | null;
  claimedWithoutRegisteredAccount: boolean;
  resolutionSource: HunterClaimResolutionSource;
};
