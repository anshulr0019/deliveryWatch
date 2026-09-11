import { randomUUID } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { alertChannels, alertDeliveries } from "@/db/schema";
import { dispatchToChannels, type AlertContext } from "@/lib/alert-sender";

/** Durable at-least-once delivery. Webhook receivers should deduplicate X-DeliveryWatch-Delivery. */
export async function drainAlertOutbox(limit = 20, userId?: string, deadline = Date.now() + 20000) {
  const summary = { sent: 0, failed: 0, retried: 0 };
  for (let i = 0; i < limit && Date.now() < deadline; i++) {
    const token = randomUUID();
    const claimed = await db.execute(sql`
      UPDATE alert_deliveries SET lease_until = now() + interval '60 seconds', lease_token = ${token}::uuid, attempts = attempts + 1
      WHERE id = (SELECT id FROM alert_deliveries
        WHERE status = 'pending' AND next_attempt_at <= now() AND (lease_until IS NULL OR lease_until < now())
        ${userId ? sql`AND user_id = ${userId}::uuid` : sql``}
        ORDER BY next_attempt_at FOR UPDATE SKIP LOCKED LIMIT 1)
      RETURNING id`);
    if (!claimed.rows.length) break;
    const id = String(claimed.rows[0].id);
    const [delivery] = await db.select().from(alertDeliveries).where(eq(alertDeliveries.id, id));
    if (!delivery) continue;
    const [channel] = await db.select().from(alertChannels).where(and(eq(alertChannels.id, delivery.channelId), eq(alertChannels.userId, delivery.userId)));
    if (!channel || !channel.isActive) {
      await db.update(alertDeliveries).set({ status: "cancelled", leaseUntil: null, leaseToken: null, lastError: "Channel removed or paused." }).where(and(eq(alertDeliveries.id, id), eq(alertDeliveries.leaseToken, token)));
      continue;
    }
    const [result] = await dispatchToChannels([channel], { ...delivery.context as AlertContext, deliveryId: id });
    if (!result) {
      await db.update(alertDeliveries).set({
        status: "cancelled",
        leaseUntil: null,
        leaseToken: null,
        lastError: "Channel type is no longer supported.",
      }).where(and(eq(alertDeliveries.id, id), eq(alertDeliveries.leaseToken, token)));
      continue;
    }
    const terminal = !result.ok && delivery.attempts >= 5;
    await db.update(alertDeliveries).set({
      status: result.ok ? "sent" : terminal ? "failed" : "pending",
      sentAt: result.ok ? new Date() : null,
      lastError: result.ok ? null : result.reason ?? "Delivery failed",
      nextAttemptAt: new Date(Date.now() + Math.min(3600, 60 * 2 ** delivery.attempts) * 1000),
      leaseUntil: null, leaseToken: null,
    }).where(and(eq(alertDeliveries.id, id), eq(alertDeliveries.leaseToken, token)));
    if (result.ok) summary.sent++; else if (terminal) summary.failed++; else summary.retried++;
  }
  return summary;
}
