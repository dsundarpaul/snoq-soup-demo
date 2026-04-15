export type AuditEventPayload = {
  occurredAt: string;
  httpMethod: string;
  path: string;
  statusCode: number;
  durationMs: number;
  actorType: string;
  actorId: string;
  ip: string;
  userAgent: string;
  action: string;
  resourceType: string;
  resourceId: string;
  correlationId: string;
  metadata: Record<string, unknown>;
};

export type AuditRemoteListItem = AuditEventPayload & { id: string };

export type AuditListRemoteResult = {
  items: AuditRemoteListItem[];
  nextCursor?: string;
  hasMore: boolean;
};
