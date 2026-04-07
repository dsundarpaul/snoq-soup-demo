import {
  PipeTransform,
  Injectable,
  BadRequestException,
  ArgumentMetadata,
} from "@nestjs/common";
import { ZodSchema, ZodError, ZodIssue } from "zod";

interface ValidationErrorDetail {
  field: string;
  message: string;
  value?: unknown;
}

@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private schema: ZodSchema) {}

  transform(value: unknown, metadata: ArgumentMetadata): unknown {
    // Skip validation for non-body parameters if no schema provided
    if (!this.schema) {
      return value;
    }

    try {
      const parsedValue = this.schema.parse(value);
      return parsedValue;
    } catch (error) {
      if (error instanceof ZodError) {
        const validationErrors = this.formatZodError(error);

        throw new BadRequestException({
          message: "Validation failed",
          error: "Bad Request",
          statusCode: 400,
          details: {
            errors: validationErrors,
            target: metadata.type,
            data:
              metadata.type === "body"
                ? "Request body"
                : metadata.type === "query"
                  ? "Query parameters"
                  : metadata.type === "param"
                    ? "Route parameters"
                    : "Data",
          },
        });
      }

      // Re-throw unexpected errors
      throw error;
    }
  }

  private formatZodError(error: ZodError): ValidationErrorDetail[] {
    return error.issues.map((issue: ZodIssue) => {
      const path = issue.path.length > 0 ? issue.path.join(".") : "value";

      return {
        field: path,
        message: this.getErrorMessage(issue),
        value:
          issue.path.length > 0
            ? this.getValueAtPath(issue.path as (string | number)[])
            : undefined,
      };
    });
  }

  private getErrorMessage(issue: ZodIssue): string {
    // Return the default message from Zod issue
    return issue.message;
  }

  private getValueAtPath(path: (string | number)[]): unknown {
    void path; // Intentionally unused - placeholder for future implementation
    return undefined;
  }
}

// Factory function for creating schema-specific pipes
export function createZodValidationPipe(schema: ZodSchema): ZodValidationPipe {
  return new ZodValidationPipe(schema);
}
