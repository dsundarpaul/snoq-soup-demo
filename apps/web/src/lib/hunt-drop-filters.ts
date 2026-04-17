import type { Drop } from "@shared/schema";

export type DropWithCount = Drop & { captureCount?: number };

export function getCaptureRemaining(drop: DropWithCount): number | null {
  if (drop.availabilityType !== "captureLimit" || !drop.captureLimit) {
    return null;
  }
  return drop.captureLimit - (drop.captureCount || 0);
}

export function isSoldOutDrop(drop: DropWithCount): boolean {
  const remaining = getCaptureRemaining(drop);
  return remaining !== null && remaining <= 0;
}

export function isScheduledNotYetLive(drop: Drop): boolean {
  if (!drop.active) return false;
  if (!drop.startTime) return false;
  return new Date(drop.startTime) > new Date();
}

export function isDropActive(drop: Drop): boolean {
  const now = new Date();
  if (drop.startTime && new Date(drop.startTime) > now) return false;
  if (drop.endTime && new Date(drop.endTime) < now) return false;
  return drop.active;
}

export type DropWithDistanceClaimed = Drop & {
  distance: number | null;
  claimed: boolean;
  captureCount?: number;
};

export function buildDropsWithDistanceClaimed(
  drops: Drop[],
  latitude: number | null,
  longitude: number | null,
  calculateDistance: (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ) => number,
  hasClaimedDrop: (dropId: string) => boolean
): DropWithDistanceClaimed[] {
  if (!latitude || !longitude) {
    return drops.map((drop) => ({
      ...drop,
      distance: null as number | null,
      claimed: hasClaimedDrop(drop.id),
    }));
  }

  return drops
    .map((drop) => ({
      ...drop,
      distance: calculateDistance(
        latitude,
        longitude,
        drop.latitude,
        drop.longitude
      ),
      claimed: hasClaimedDrop(drop.id),
    }))
    .sort((a, b) => {
      if (a.claimed && !b.claimed) return 1;
      if (!a.claimed && b.claimed) return -1;
      if (a.distance === null) return 1;
      if (b.distance === null) return -1;
      return a.distance - b.distance;
    });
}

export function getInRangeHuntableDrops(
  dropsWithMeta: DropWithDistanceClaimed[]
): DropWithDistanceClaimed[] {
  const huntable = dropsWithMeta.filter(
    (d) => !d.claimed && !isSoldOutDrop(d) && isDropActive(d)
  );
  return huntable.filter(
    (d) => d.distance !== null && d.distance <= d.radius
  );
}

export function getBrowseActiveDrops(
  dropsWithMeta: DropWithDistanceClaimed[],
  inRangeDrops: DropWithDistanceClaimed[]
): DropWithDistanceClaimed[] {
  const inRangeIds = new Set(inRangeDrops.map((d) => d.id));
  return dropsWithMeta.filter(
    (d) =>
      !inRangeIds.has(d.id) && !isSoldOutDrop(d) && isDropActive(d)
  );
}
