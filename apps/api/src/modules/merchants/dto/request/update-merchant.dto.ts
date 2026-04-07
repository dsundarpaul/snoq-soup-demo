export class UpdateMerchantDto {
  name?: string;
  description?: string;
  address?: string;
  phone?: string;
  website?: string;
  socialLinks?: Record<string, string>;
}
