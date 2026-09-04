import {
  pgTable,
  uuid,
  text,
  boolean,
  integer,
  timestamp,
  jsonb,
  unique,
  index,
} from "drizzle-orm/pg-core";

/**
 * DeliverWatch schema.
 * Mirrors the Supabase design (profiles / domains / checks / events / alert_channels)
 * but runs on plain PostgreSQL via Drizzle, with first-party session auth.
 */

export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  fullName: text("full_name"),
  passwordHash: text("password_hash").notNull(),
  plan: text("plan").notNull().default("community"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);

export const domains = pgTable(
  "domains",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    domain: text("domain").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    latestScore: integer("latest_score").notNull().default(0),
    lastCheckedAt: timestamp("last_checked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique("domains_user_domain_unique").on(t.userId, t.domain), index("domains_user_idx").on(t.userId)],
);

export const checks = pgTable(
  "checks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    domainId: uuid("domain_id")
      .notNull()
      .references(() => domains.id, { onDelete: "cascade" }),
    score: integer("score").notNull(),
    spfStatus: text("spf_status").notNull().default("unknown"),
    spfDetails: jsonb("spf_details").notNull().default({}),
    dkimStatus: text("dkim_status").notNull().default("unknown"),
    dkimDetails: jsonb("dkim_details").notNull().default({}),
    dmarcStatus: text("dmarc_status").notNull().default("unknown"),
    dmarcDetails: jsonb("dmarc_details").notNull().default({}),
    mxStatus: text("mx_status").notNull().default("unknown"),
    mxDetails: jsonb("mx_details").notNull().default({}),
    rblStatus: text("rbl_status").notNull().default("unknown"),
    rblDetails: jsonb("rbl_details").notNull().default({}),
    checkedAt: timestamp("checked_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("checks_domain_idx").on(t.domainId, t.checkedAt)],
);

export const events = pgTable(
  "events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    domainId: uuid("domain_id")
      .notNull()
      .references(() => domains.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    severity: text("severity").notNull(), // 'info' | 'warning' | 'critical'
    title: text("title").notNull(),
    description: text("description"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("events_domain_idx").on(t.domainId, t.createdAt)],
);

export const alertChannels = pgTable(
  "alert_channels",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    type: text("type").notNull(), // 'email' | 'slack' | 'whatsapp' | 'webhook'
    config: jsonb("config").notNull().default({}),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("alert_channels_user_idx").on(t.userId)],
);

export type Profile = typeof profiles.$inferSelect;
export type Domain = typeof domains.$inferSelect;
export type Check = typeof checks.$inferSelect;
export type DomainEvent = typeof events.$inferSelect;
export type AlertChannel = typeof alertChannels.$inferSelect;
