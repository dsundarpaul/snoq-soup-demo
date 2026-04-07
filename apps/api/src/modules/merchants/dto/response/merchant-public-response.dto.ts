export class MerchantPublicResponseDto {
  name!: string;
  description?: string;
  logoUrl?: string | null;
  address?: string;
  phone?: string;
  website?: string;
  socialLinks?: Record<string, string>;
  username!: string;
  isVerified!: boolean;
  totalDrops!: number;
  activeDrops!: number;
}
