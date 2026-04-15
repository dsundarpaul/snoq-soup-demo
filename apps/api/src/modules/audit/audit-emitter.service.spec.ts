import { AuditEmitterService } from "./audit-emitter.service";
import { config } from "../../config/app.config";

describe("AuditEmitterService", () => {
  it("constructs and shuts down without throwing", () => {
    const service = new AuditEmitterService();
    expect(service).toBeDefined();
    service.onModuleDestroy();
  });

  it("enqueue is a no-op when audit is disabled", () => {
    expect(config.audit.enabled).toBe(false);
    const service = new AuditEmitterService();
    service.enqueue({
      occurredAt: new Date().toISOString(),
      httpMethod: "GET",
      path: "/api/v1/test",
      statusCode: 200,
      durationMs: 1,
      actorType: "anonymous",
      actorId: "",
      ip: "",
      userAgent: "",
      action: "test.action",
      resourceType: "",
      resourceId: "",
      correlationId: "",
      metadata: {},
    });
    service.onModuleDestroy();
  });
});
