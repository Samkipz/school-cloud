import { getDb } from "@/lib/db";
import { auditLogs } from "@/lib/schema";

export type AuditPayload = {
  actorId: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
};

export async function writeAuditLog(payload: AuditPayload) {
  const db = getDb();
  await db.insert(auditLogs).values({
    actorId: payload.actorId ?? null,
    action: payload.action,
    entityType: payload.entityType,
    entityId: payload.entityId ?? null,
    metadata: payload.metadata ? JSON.stringify(payload.metadata) : null,
  });
}
