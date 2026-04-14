export class StoreLocationResponseDto {
  lat!: number;
  lng!: number;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  landmark?: string;
  howToReach?: string;
}

export class MerchantResponseDto {
  id!: string;
  email!: string;
  name!: string;
  description?: string;
  logoUrl?: string | null;
  address?: string;
  phone?: string;
  website?: string;
  socialLinks?: Record<string, string>;
  storeLocation?: StoreLocationResponseDto | null;
  businessPhone?: string | null;
  businessHours?: string | null;
  username!: string;
  isVerified!: boolean;
  isActive!: boolean;
  createdAt!: Date;
  updatedAt!: Date;
}
