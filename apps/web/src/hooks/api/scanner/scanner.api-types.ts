export interface StaffScannerAssignment {
  id: string;
  staffMemberId: string;
  staffName: string;
  staffEmail: string | null;
  staffPhone: string | null;
  scannerToken: string;
  scanUrl: string;
  createdAtIso: string;
  expiresAtIso: string;
  disabled: boolean;
}

export interface CreateStaffScannerAssignmentInput {
  staffName: string;
  staffPhone: string;
  expiresAtIso: string;
}

export interface UseStaffScannerAssignmentsResult {
  assignments: StaffScannerAssignment[];
  isLoading: boolean;
  createAssignment: (
    input: CreateStaffScannerAssignmentInput
  ) => Promise<StaffScannerAssignment>;
  removeAssignment: (id: string) => Promise<void>;
  setAssignmentDisabled: (id: string, disabled: boolean) => Promise<void>;
}

export interface MerchantStaffDirectoryEntry {
  id: string;
  displayName: string;
  email: string | null;
}

export interface MerchantScannerTokenResponse {
  token: string;
  expiresAt: string;
  createdAt: string;
}
