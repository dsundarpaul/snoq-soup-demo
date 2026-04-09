export class ActiveDropDto {
  id!: string;
  name!: string;
  description?: string;
  location!: {
    lat: number;
    lng: number;
  };
  radius!: number;
  rewardValue!: number;
  logoUrl?: string;
  distance?: number;
  merchantId!: string;
  merchantName!: string;
  merchantLogoUrl?: string;
}

export class ActiveDropsResponseDto {
  drops!: ActiveDropDto[];
  total!: number;
}
