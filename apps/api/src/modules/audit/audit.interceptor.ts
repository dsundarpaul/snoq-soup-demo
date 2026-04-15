import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Request, Response } from "express";
import { Observable } from "rxjs";
import { config } from "../../config/app.config";
import { AUDIT_ACTION_METADATA_KEY } from "./audit.constants";
import { AuditEmitterService } from "./audit-emitter.service";
import type { AuditEventPayload } from "./audit.types";

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly emitter: AuditEmitterService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const action = this.reflector.getAllAndOverride<string | undefined>(
      AUDIT_ACTION_METADATA_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!config.audit.enabled || !action) {
      return next.handle();
    }
    const http = context.switchToHttp();
    const req = http.getRequest<Request>();
    const res = http.getResponse<Response>();
    const started = Date.now();
    let recorded = false;
    const record = (): void => {
      if (recorded) {
        return;
      }
      recorded = true;
      const user = req.user as
        | { userId: string; email: string; type: string }
        | undefined;
      const pathRaw = req.originalUrl ?? req.url ?? "";
      const path = pathRaw.split("?")[0] ?? pathRaw;
      const payload: AuditEventPayload = {
        occurredAt: new Date().toISOString(),
        httpMethod: req.method,
        path,
        statusCode: res.statusCode,
        durationMs: Math.max(0, Date.now() - started),
        actorType: user?.type ?? "anonymous",
        actorId: user?.userId ?? "",
        ip: req.ip ?? "",
        userAgent: req.get("user-agent") ?? "",
        action,
        resourceType: "",
        resourceId: "",
        correlationId: req.correlationId ?? "",
        metadata: {},
      };
      this.emitter.enqueue(payload);
    };
    res.once("finish", record);
    res.once("close", record);
    return next.handle();
  }
}
