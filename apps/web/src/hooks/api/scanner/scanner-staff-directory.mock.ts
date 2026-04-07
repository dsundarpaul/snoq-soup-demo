import type { MerchantStaffDirectoryEntry } from "./scanner.api-types";

export const MOCK_MERCHANT_STAFF_DIRECTORY: MerchantStaffDirectoryEntry[] = [
  {
    id: "dir_counter_a",
    displayName: "Ahmed — Counter A",
    email: "ahmed@store.example",
  },
  {
    id: "dir_counter_b",
    displayName: "Sara — Counter B",
    email: "sara@store.example",
  },
  {
    id: "dir_floor",
    displayName: "Floor supervisor",
    email: null,
  },
  {
    id: "dir_delivery",
    displayName: "Delivery desk",
    email: "delivery@store.example",
  },
];

export function getStaffDirectoryEntryById(
  id: string
): MerchantStaffDirectoryEntry | undefined {
  return MOCK_MERCHANT_STAFF_DIRECTORY.find((s) => s.id === id);
}
