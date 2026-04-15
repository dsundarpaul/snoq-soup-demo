import {
  Injectable,
  Logger,
  OnModuleDestroy,
  BeforeApplicationShutdown,
} from "@nestjs/common";
import { Agent, fetch } from "undici";
import { config } from "../../config/app.config";
import type { AuditEventPayload } from "./audit.types";

@Injectable()
export class AuditEmitterService
  implements OnModuleDestroy, BeforeApplicationShutdown
{
  private readonly logger = new Logger(AuditEmitterService.name);
  private readonly buffer: AuditEventPayload[] = [];
  private readonly agent = new Agent({
    connections: 4,
    keepAliveTimeout: 30_000,
  });
  private interval: ReturnType<typeof setInterval> | null = null;
  private inFlight = false;
  private failureStreak = 0;
  private circuitOpenUntil = 0;
  private lastCircuitWarnAt = 0;
  private droppedSinceLog = 0;
  private lastDropLogAt = 0;

  constructor() {
    if (
      config.audit.enabled &&
      config.audit.baseUrl &&
      config.audit.serviceKey
    ) {
      this.interval = setInterval(() => {
        void this.flush();
      }, config.audit.flushIntervalMs);
      this.interval.unref?.();
    }
  }

  enqueue(event: AuditEventPayload): void {
    if (
      !config.audit.enabled ||
      !config.audit.baseUrl ||
      !config.audit.serviceKey
    ) {
      return;
    }
    if (this.buffer.length >= config.audit.maxBufferEvents) {
      this.buffer.shift();
      this.droppedSinceLog += 1;
      this.maybeLogDrop();
    }
    this.buffer.push(event);
    if (this.buffer.length >= config.audit.maxBatchSize) {
      void this.flush();
    }
  }

  private maybeLogDrop(): void {
    const now = Date.now();
    if (now - this.lastDropLogAt > 60_000) {
      this.logger.warn(
        `Audit buffer overflow; dropped events (since last log: ${this.droppedSinceLog})`,
      );
      this.droppedSinceLog = 0;
      this.lastDropLogAt = now;
    }
  }

  private canAttemptIngest(): boolean {
    return Date.now() >= this.circuitOpenUntil;
  }

  private onIngestSuccess(): void {
    this.failureStreak = 0;
    this.circuitOpenUntil = 0;
  }

  private onIngestFailure(): void {
    this.failureStreak += 1;
    if (this.failureStreak >= config.audit.circuitFailureThreshold) {
      this.circuitOpenUntil = Date.now() + config.audit.circuitHalfOpenAfterMs;
      this.failureStreak = 0;
      const now = Date.now();
      if (now - this.lastCircuitWarnAt > 30_000) {
        this.logger.warn(
          "Audit ingest circuit opened; outbound requests paused temporarily",
        );
        this.lastCircuitWarnAt = now;
      }
    }
  }

  async flush(): Promise<void> {
    if (this.inFlight) {
      return;
    }
    if (!this.canAttemptIngest()) {
      return;
    }
    if (this.buffer.length === 0) {
      return;
    }
    const batch = this.buffer.splice(0, config.audit.maxBatchSize);
    if (batch.length === 0) {
      return;
    }
    this.inFlight = true;
    const url = `${config.audit.baseUrl}/internal/v1/events`;
    const controller = new AbortController();
    const timer = setTimeout(
      () => controller.abort(),
      config.audit.requestTimeoutMs,
    );
    try {
      const res = await fetch(url, {
        method: "POST",
        dispatcher: this.agent,
        headers: {
          "Content-Type": "application/json",
          "X-Audit-Service-Key": config.audit.serviceKey,
        },
        body: JSON.stringify({ events: batch }),
        signal: controller.signal,
      });
      if (!res.ok) {
        this.buffer.unshift(...batch);
        this.onIngestFailure();
        return;
      }
      this.onIngestSuccess();
    } catch {
      this.buffer.unshift(...batch);
      this.onIngestFailure();
    } finally {
      clearTimeout(timer);
      this.inFlight = false;
    }
  }

  async flushAllBestEffort(timeoutMs: number): Promise<void> {
    const deadline = Date.now() + timeoutMs;
    while (this.buffer.length > 0 && Date.now() < deadline) {
      await this.flush();
      await new Promise((r) => setTimeout(r, 15));
    }
  }

  onModuleDestroy(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  async beforeApplicationShutdown(): Promise<void> {
    await this.flushAllBestEffort(3000);
  }
}
