export type HunterVoucherStatus = "all" | "unredeemed" | "redeemed";

export const treasureHunterQueryKeys = {
  profile: ["hunter-profile-v1"] as const,
  history: ["hunter-history-v1"] as const,
  vouchers: ["hunter-vouchers-v1"] as const,
  vouchersSummary: (unredeemedLimit?: number, redeemedLimit?: number) =>
    ["hunter-vouchers-v1", "summary", unredeemedLimit, redeemedLimit] as const,
  vouchersList: (status: HunterVoucherStatus, limit: number) =>
    ["hunter-vouchers-v1", "list", status, limit] as const,
  leaderboard: (limit: number) => ["/api/v1/leaderboard", limit] as const,
};
