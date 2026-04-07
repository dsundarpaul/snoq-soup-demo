export interface PaginationOptions {
  page: number;
  limit: number;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface ApiResponse<T> {
  data: T;
  success: boolean;
  timestamp: string;
  path: string;
}

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface RedemptionConfig {
  type: 'anytime' | 'timer' | 'window';
  minutes?: number;
  deadline?: Date;
}

export interface AvailabilityConfig {
  type: 'unlimited' | 'limited';
  limit?: number;
}

export interface ScheduleConfig {
  start?: Date;
  end?: Date;
}
