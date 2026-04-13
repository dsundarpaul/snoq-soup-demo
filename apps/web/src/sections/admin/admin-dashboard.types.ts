import type { mapAdminAnalyticsToLegacy } from "@/lib/nest-mappers";

export type AdminAnalyticsLegacy = ReturnType<typeof mapAdminAnalyticsToLegacy>;
