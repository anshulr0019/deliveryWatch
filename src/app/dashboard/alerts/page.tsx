import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { alertChannels } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { AlertChannelsManager, type ChannelRow } from "@/components/dashboard/AlertChannelsManager";

export const dynamic = "force-dynamic";

export default async function AlertsPage() {
  const user = await requireUser();
  const rows = await db.select().from(alertChannels).where(eq(alertChannels.userId, user.id)).orderBy(desc(alertChannels.createdAt));

  const channels: ChannelRow[] = rows.map((c) => ({
    id: c.id,
    type: c.type as ChannelRow["type"],
    config: c.config as Record<string, string>,
    isActive: c.isActive,
    createdAt: c.createdAt.toISOString(),
  }));

  return (
    <AlertChannelsManager
      initialChannels={channels}
      userEmail={user.email}
      integrations={{
        email: Boolean(process.env.RESEND_API_KEY),
        whatsapp: Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_WHATSAPP_NUMBER),
      }}
    />
  );
}
