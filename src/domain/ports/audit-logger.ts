export interface AuditLogInput {
  actorId: string;
  action: string;
  entity: string;
  entityId: string;
  metadata?: Record<string, unknown>;
}

export interface AuditLogger {
  record(input: AuditLogInput): Promise<void>;
}
