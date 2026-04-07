import { publicUrls } from "@/lib/app-config";
import type {
  CreateStaffScannerAssignmentInput,
  StaffScannerAssignment,
} from "./scanner.api-types";

export function generateMockStaffScannerToken(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `mock_${crypto.randomUUID().replace(/-/g, "").slice(0, 20)}`;
  }
  return `mock_${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}

function newRowId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `row_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function buildAssignmentFromInput(
  input: CreateStaffScannerAssignmentInput
): StaffScannerAssignment {
  const staffMemberId = newRowId();
  const scannerToken = generateMockStaffScannerToken();
  const scanUrl = publicUrls.staffScan(scannerToken);
  return {
    id: newRowId(),
    staffMemberId,
    staffName: input.staffName.trim(),
    staffEmail: null,
    staffPhone: input.staffPhone.trim() || null,
    scannerToken,
    scanUrl,
    createdAtIso: new Date().toISOString(),
    expiresAtIso: input.expiresAtIso,
    disabled: false,
  };
}

export const INITIAL_MOCK_STAFF_SCANNER_ASSIGNMENTS: StaffScannerAssignment[] =
  [];
