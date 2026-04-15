import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { Agent, fetch } from "undici";
import { config } from "../../config/app.config";
import type { AuditListRemoteResult } from "./audit.types";

@Injectable()
export class AuditRemoteService {
  private readonly agent = new Agent({
    connections: 4,
    keepAliveTimeout: 30_000,
  });

  private assertConfigured(): void {
    if (!config.audit.baseUrl || !config.audit.serviceKey) {
      throw new ServiceUnavailableException("Audit service is not configured");
    }
  }

  async listEvents(
    searchParams: URLSearchParams,
  ): Promise<AuditListRemoteResult> {
    this.assertConfigured();
    const url = `${config.audit.baseUrl}/internal/v1/events?${searchParams.toString()}`;
    const res = await fetch(url, {
      method: "GET",
      dispatcher: this.agent,
      headers: { "X-Audit-Service-Key": config.audit.serviceKey },
    });
    if (!res.ok) {
      throw new ServiceUnavailableException("Audit service request failed");
    }
    return (await res.json()) as AuditListRemoteResult;
  }

  async tailEvents(
    since: string | undefined,
    limit: number,
  ): Promise<AuditListRemoteResult> {
    this.assertConfigured();
    const qs = new URLSearchParams();
    qs.set("limit", String(limit));
    if (since) {
      qs.set("since", since);
    }
    const url = `${config.audit.baseUrl}/internal/v1/events/tail?${qs.toString()}`;
    const res = await fetch(url, {
      method: "GET",
      dispatcher: this.agent,
      headers: { "X-Audit-Service-Key": config.audit.serviceKey },
    });
    if (!res.ok) {
      throw new ServiceUnavailableException("Audit service request failed");
    }
    const body = (await res.json()) as {
      items: AuditListRemoteResult["items"];
    };
    return { items: body.items ?? [], hasMore: false };
  }
}
