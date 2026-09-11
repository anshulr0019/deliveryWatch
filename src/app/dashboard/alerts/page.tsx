import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { alertChannels, alertDeliveries } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { AlertChannelsManager, type ChannelRow, type ChannelType } from "@/components/dashboard/AlertChannelsManager";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Alert Channels — DeliveryWatch",
  description: "Configure email, Slack, and webhook alert channels for deliverability notifications.",
};

export default async function AlertsPage() {
  const user = await requireUser();
  const rows = await db.select().from(alertChannels).where(eq(alertChannels.userId, user.id)).orderBy(desc(alertChannels.createdAt));

  const deliveries = await db.select().from(alertDeliveries).where(eq(alertDeliveries.userId, user.id)).orderBy(desc(alertDeliveries.createdAt)).limit(30);

  // Ignore channel types from older builds so legacy rows cannot crash the manager
  // or appear as supported options.
  const channels: ChannelRow[] = rows.flatMap((c) => {
    if (c.type !== "email" && c.type !== "slack" && c.type !== "webhook") return [];
    return [{
      id: c.id,
      type: c.type as ChannelType,
      config: c.config as Record<string, string>,
      isActive: c.isActive,
      createdAt: c.createdAt.toISOString(),
    }];
  });

  return (
    <>
    <AlertChannelsManager
      initialChannels={channels}
      userEmail={user.email}
      integrations={{ email: Boolean(process.env.RESEND_API_KEY) }}
    />
    <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6">
      <h2 className="text-lg font-bold">Recent delivery attempts</h2>
      <p className="mt-1 text-xs text-slate-500">Sent means the provider accepted the request. Pending deliveries retry on scheduled sweeps, up to five attempts.</p>
      {deliveries.length ? <ul className="mt-4 divide-y divide-slate-100">{deliveries.map(d => <li key={d.id} className="py-3 text-sm">
        <span className="font-semibold capitalize">{d.status}</span> · {d.attempts} attempt{d.attempts === 1 ? "" : "s"} · {d.createdAt.toISOString()}
        {d.lastError && <p className="mt-1 text-xs text-rose-700">{d.lastError}</p>}
      </li>)}</ul> : <p className="mt-4 text-sm text-slate-500">No alert deliveries have been queued yet.</p>}
    </section>
    </>
  );
}
