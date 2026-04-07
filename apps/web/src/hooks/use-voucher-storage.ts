import { useState, useEffect, useCallback } from "react";
import type { Voucher, Drop } from "@shared/schema";

interface StoredVoucher {
  voucher: Voucher;
  drop: Drop;
  claimedAt: string;
}

const STORAGE_KEY = "souq-snap-vouchers";

export function useVoucherStorage() {
  const [vouchers, setVouchers] = useState<StoredVoucher[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setVouchers(JSON.parse(stored));
      }
    } catch (error) {
      console.error("Failed to load vouchers from storage:", error);
    }
  }, []);

  const saveVoucher = useCallback((voucher: Voucher, drop: Drop) => {
    const newVoucher: StoredVoucher = {
      voucher,
      drop,
      claimedAt: new Date().toISOString(),
    };

    setVouchers((prev) => {
      const existing = prev.find((v) => v.voucher.id === voucher.id);
      if (existing) return prev;

      const updated = [...prev, newVoucher];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const getVoucher = useCallback(
    (voucherId: string) => {
      return vouchers.find((v) => v.voucher.id === voucherId);
    },
    [vouchers]
  );

  const hasClaimedDrop = useCallback(
    (dropId: string) => {
      return vouchers.some((v) => v.voucher.dropId === dropId);
    },
    [vouchers]
  );

  const markRedeemed = useCallback((voucherId: string) => {
    setVouchers((prev) => {
      const updated = prev.map((v) =>
        v.voucher.id === voucherId
          ? { ...v, voucher: { ...v.voucher, redeemed: true } }
          : v
      );
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  return {
    vouchers,
    saveVoucher,
    getVoucher,
    hasClaimedDrop,
    markRedeemed,
  };
}
