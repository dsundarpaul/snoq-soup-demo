export interface StoreLocation {
  lat: number;
  lng: number;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  landmark?: string;
  howToReach?: string;
}

export interface Merchant {
  id: string;
  username: string;
  password: string;
  businessName: string;
  email: string;
  emailVerified: boolean;
  verificationToken: string | null;
  resetToken: string | null;
  resetTokenExpiry: Date | null;
  scannerToken: string | null;
  logoUrl: string | null;
  createdAt: Date | null;
  storeLocation?: StoreLocation | null;
  businessPhone?: string | null;
  businessHours?: string | null;
}

export interface Drop {
  id: string;
  merchantId: string;
  /** Populated on active-drops API responses */
  merchantName?: string | null;
  /** Merchant profile logo (distinct from drop marketing `logoUrl`) */
  merchantLogoUrl?: string | null;
  name: string;
  description: string;
  latitude: number;
  longitude: number;
  radius: number;
  rewardValue: string;
  termsAndConditions: string | null;
  logoUrl: string | null;
  redemptionType: string;
  redemptionMinutes: number | null;
  redemptionDeadline: Date | null;
  availabilityType: string;
  captureLimit: number | null;
  active: boolean;
  startTime: Date | null;
  endTime: Date | null;
  voucherAbsoluteExpiresAt: Date | null;
  voucherTtlHoursAfterClaim: number | null;
  createdAt: Date | null;
}

export interface Voucher {
  id: string;
  dropId: string;
  merchantId: string;
  claimedAt: Date | null;
  redeemedAt: Date | null;
  redeemed: boolean;
  userEmail: string | null;
  userPhone: string | null;
  magicToken: string;
  deviceId: string | null;
  hunterId: string | null;
  expiresAt: Date | null;
  claimedWithoutRegisteredAccount?: boolean;
}

export interface User {
  id: string;
  username: string;
  password: string;
}

export interface TreasureHunter {
  id: string;
  deviceId: string;
  nickname: string | null;
  email: string | null;
  password: string | null;
  dateOfBirth: string | null;
  gender: string | null;
  mobileCountryCode: string | null;
  mobileNumber: string | null;
  resetToken: string | null;
  resetTokenExpiry: Date | null;
  totalClaims: number;
  totalRedemptions: number;
  createdAt: Date | null;
}

export interface Admin {
  id: string;
  email: string;
  password: string;
  name: string;
  createdAt: Date | null;
}

export interface PromoCode {
  id: string;
  dropId: string;
  merchantId: string;
  code: string;
  status: string;
  voucherId: string | null;
  assignedAt: Date | null;
  createdAt: Date | null;
}
