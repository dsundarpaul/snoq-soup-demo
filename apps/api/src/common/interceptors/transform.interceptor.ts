import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";
import { Request } from "express";

interface ApiResponse<T> {
  success: true;
  data: T;
  timestamp: string;
  path: string;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<
  T,
  ApiResponse<T>
> {
  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<ApiResponse<T>> {
    const request = context.switchToHttp().getRequest<Request>();
    const path = request.url;

    return next.handle().pipe(
      map((data: T) => {
        // If data is already wrapped (e.g., with meta), extract it
        if (data && typeof data === "object" && "success" in data) {
          return data as unknown as ApiResponse<T>;
        }

        // Check if data has pagination meta
        let meta: ApiResponse<T>["meta"] | undefined;

        if (data && typeof data === "object") {
          const dataObj = data as Record<string, unknown>;

          // Check for common pagination patterns
          if (
            "page" in dataObj ||
            "limit" in dataObj ||
            "total" in dataObj ||
            "data" in dataObj
          ) {
            // Extract pagination meta if present
            const { data: nestedData, ...paginationMeta } = dataObj;
            if (nestedData !== undefined) {
              meta = {
                page: paginationMeta.page as number | undefined,
                limit: paginationMeta.limit as number | undefined,
                total: paginationMeta.total as number | undefined,
                totalPages: paginationMeta.totalPages as number | undefined,
              };

              // Remove undefined values from meta
              Object.keys(meta).forEach((key) => {
                if (meta![key as keyof typeof meta] === undefined) {
                  delete meta![key as keyof typeof meta];
                }
              });

              // Return with nested data
              return {
                success: true,
                data: nestedData as T,
                timestamp: new Date().toISOString(),
                path,
                ...(Object.keys(meta).length > 0 && { meta }),
              } as ApiResponse<T>;
            }
          }
        }

        // Standard response wrapping
        return {
          success: true,
          data,
          timestamp: new Date().toISOString(),
          path,
        } as ApiResponse<T>;
      }),
    );
  }
}
