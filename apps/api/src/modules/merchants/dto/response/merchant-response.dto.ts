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
  username!: string;
  isVerified!: boolean;
  isActive!: boolean;
  createdAt!: Date;
  updatedAt!: Date;
}
