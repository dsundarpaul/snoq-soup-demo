"use client";

import { useCallback, useMemo, useState } from "react";
import {
  useMutation,
  useQuery,
  type UseMutationOptions,
} from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { treasureHunterQueryKeys } from "@/hooks/api/treasure-hunter/use-treasure-hunter";
import type {
  CreateStaffScannerAssignmentInput,
  StaffScannerAssignment,
  UseStaffScannerAssignmentsResult,
} from "./scanner.api-types";
import { validateStaffPhoneE164 } from "@/utils/phone-country";
import {
  INITIAL_MOCK_STAFF_SCANNER_ASSIGNMENTS,
  buildAssignmentFromInput,
} from "./scanner-assignments.mock";

function useStaffScannerAssignmentsMock(): UseStaffScannerAssignmentsResult {
  const [assignments, setAssignments] = useState<StaffScannerAssignment[]>(
    () => [...INITIAL_MOCK_STAFF_SCANNER_ASSIGNMENTS]
  );

  const createAssignment = useCallback(
    async (input: CreateStaffScannerAssignmentInput) => {
      if (!input.staffName?.trim()) {
        throw new Error("Staff name is required");
      }
      const phone = input.staffPhone?.trim() ?? "";
      if (!phone) {
        throw new Error("Phone number is required");
      }
      if (!validateStaffPhoneE164(phone)) {
        throw new Error(
          "Enter a valid +966 (9 digits) or +91 (10 digits) number"
        );
      }
      if (!input.expiresAtIso?.trim()) {
        throw new Error("Expiry date is required");
      }
      const row = buildAssignmentFromInput(input);
      setAssignments((prev) => [row, ...prev]);
      return row;
    },
    []
  );

  const removeAssignment = useCallback(async (id: string) => {
    setAssignments((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const setAssignmentDisabled = useCallback(
    async (id: string, disabled: boolean) => {
      setAssignments((prev) =>
        prev.map((a) => (a.id === id ? { ...a, disabled } : a))
      );
    },
    []
  );

  return useMemo(
    () => ({
      assignments,
      isLoading: false,
      createAssignment,
      removeAssignment,
      setAssignmentDisabled,
    }),
    [assignments, createAssignment, removeAssignment, setAssignmentDisabled]
  );
}

export function useStaffScannerAssignments(): UseStaffScannerAssignmentsResult {
  return useStaffScannerAssignmentsMock();
}

export const scannerQueryKeys = {
  validate: (token: string) =>
    ["/api/v1/scanner/validate", token] as const,
};

export function useStaffScannerValidateQuery(token: string) {
  return useQuery({
    queryKey: scannerQueryKeys.validate(token),
    queryFn: async () => {
      const res = await apiRequest("POST", "/api/v1/scanner/validate", {
        token,
      });
      const data = (await res.json()) as {
        valid: boolean;
        merchant?: { businessName?: string } | null;
      };
      return {
        valid: data.valid,
        businessName: data.merchant?.businessName ?? "",
      };
    },
    enabled: !!token,
  });
}

export function useStaffScannerRedeemMutation(
  token: string,
  options?: Omit<
    UseMutationOptions<
      Record<string, unknown>,
      Error,
      { voucherId: string; magicToken: string }
    >,
    "mutationFn"
  >
) {
  return useMutation({
    ...options,
    mutationFn: async (data: { voucherId: string; magicToken: string }) => {
      const response = await apiRequest("POST", "/api/v1/scanner/redeem", {
        scannerToken: token,
        voucherId: data.voucherId,
        magicToken: data.magicToken,
      });
      return response.json() as Promise<Record<string, unknown>>;
    },
    onSuccess: (...args) => {
      queryClient.invalidateQueries({
        queryKey: scannerQueryKeys.validate(token),
      });
      queryClient.invalidateQueries({
        queryKey: treasureHunterQueryKeys.profile,
      });
      queryClient.invalidateQueries({
        queryKey: treasureHunterQueryKeys.history,
      });
      options?.onSuccess?.(...args);
    },
  });
}

export function useMerchantScannerTokenMutation(
  options?: Omit<UseMutationOptions<unknown, Error, void>, "mutationFn">
) {
  return useMutation({
    ...options,
    mutationFn: async () => {
      const res = await apiRequest(
        "POST",
        "/api/v1/merchants/me/scanner-token",
        {},
        { auth: "merchant" }
      );
      return res.json() as Promise<Record<string, unknown>>;
    },
    onSuccess: (...args) => {
      queryClient.invalidateQueries({
        queryKey: ["/api/v1/merchants/me/scanner-token"],
      });
      options?.onSuccess?.(...args);
    },
  });
}
