import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { Request, Response } from "express";
import { config } from "../../config/app.config";

interface ErrorResponse {
  success: false;
  statusCode: number;
  message: string;
  error: string;
  timestamp: string;
  path: string;
  details?: Record<string, unknown>;
}

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: HttpException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    const isProduction = config.NODE_ENV === "production";

    // Build error response
    const errorResponse: ErrorResponse = {
      success: false,
      statusCode: status,
      message:
        isProduction && status === HttpStatus.INTERNAL_SERVER_ERROR
          ? "Internal server error"
          : this.extractMessage(exceptionResponse),
      error: this.getErrorName(status),
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    // Add validation error details if available (only in non-production environments)
    if (
      !isProduction &&
      typeof exceptionResponse === "object" &&
      exceptionResponse !== null
    ) {
      const responseObj = exceptionResponse as Record<string, unknown>;
      if (responseObj.details) {
        errorResponse.details = responseObj.details as Record<string, unknown>;
      }
    }

    // Log error (always log full error details regardless of environment)
    this.logError(errorResponse, exception);

    response.status(status).json(errorResponse);
  }

  private extractMessage(exceptionResponse: string | object): string {
    if (typeof exceptionResponse === "string") {
      return exceptionResponse;
    }

    if (typeof exceptionResponse === "object" && exceptionResponse !== null) {
      const response = exceptionResponse as Record<string, unknown>;

      // Handle array of messages (validation errors)
      if (Array.isArray(response.message)) {
        return response.message.join(", ");
      }

      return (response.message as string) || "An error occurred";
    }

    return "An error occurred";
  }

  private getErrorName(status: number): string {
    const statusNames: Record<number, string> = {
      [HttpStatus.BAD_REQUEST]: "Bad Request",
      [HttpStatus.UNAUTHORIZED]: "Unauthorized",
      [HttpStatus.FORBIDDEN]: "Forbidden",
      [HttpStatus.NOT_FOUND]: "Not Found",
      [HttpStatus.CONFLICT]: "Conflict",
      [HttpStatus.UNPROCESSABLE_ENTITY]: "Unprocessable Entity",
      [HttpStatus.TOO_MANY_REQUESTS]: "Too Many Requests",
      [HttpStatus.INTERNAL_SERVER_ERROR]: "Internal Server Error",
    };

    return statusNames[status] || "Error";
  }

  private logError(
    errorResponse: ErrorResponse,
    exception: HttpException,
  ): void {
    const { statusCode, path, message } = errorResponse;

    if (statusCode >= 500) {
      this.logger.error(
        `[${statusCode}] ${path} - ${message}`,
        exception.stack,
      );
    } else if (statusCode >= 400) {
      this.logger.warn(`[${statusCode}] ${path} - ${message}`);
    }
  }
}
