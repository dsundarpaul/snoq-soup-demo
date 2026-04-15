import { Module } from "@nestjs/common";
import { APP_INTERCEPTOR } from "@nestjs/core";
import { AuditEmitterService } from "./audit-emitter.service";
import { AuditRemoteService } from "./audit-remote.service";
import { AuditInterceptor } from "./audit.interceptor";

@Module({
  providers: [
    AuditEmitterService,
    AuditRemoteService,
    AuditInterceptor,
    { provide: APP_INTERCEPTOR, useExisting: AuditInterceptor },
  ],
  exports: [AuditEmitterService, AuditRemoteService],
})
export class AuditModule {}
