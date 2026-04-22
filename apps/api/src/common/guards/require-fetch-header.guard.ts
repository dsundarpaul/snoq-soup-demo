import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from "@nestjs/common";
import { Request } from "express";

@Injectable()
export class RequireFetchHeaderGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    if (process.env.NODE_ENV === "test") {
      return true;
    }
    const req = context.switchToHttp().getRequest<Request>();
    const method = req.method.toUpperCase();
    if (method === "GET" || method === "HEAD" || method === "OPTIONS") {
      return true;
    }
    const v = req.headers["x-requested-with"];
    if (v === "fetch") {
      return true;
    }
    throw new ForbiddenException("Invalid request origin");
  }
}
