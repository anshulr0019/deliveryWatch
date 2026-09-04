# DeliverWatch

**Continuous Deliverability & Blacklist Monitoring — 100% Free.**
The MailScore instant checker, upgraded into a SaaS: accounts, unlimited monitored domains, 15‑minute re‑checks, history charts, change detection and WhatsApp / Slack / email / webhook alerts. No Stripe, no plans, no limits.

## Stack

- Next.js 16 (App Router, `proxy.ts` route guard) · React 19 · Tailwind v4
- PostgreSQL via Drizzle ORM (`src/db/schema.ts`)
- First‑party auth: scrypt password hashes + httpOnly session cookies (`src/lib/auth.ts`)
- Real DNS engine in `src/lib/dns-check.ts` (`checkDomain(domain)` → `MailScoreResult`)
- Recharts, lucide-react, date-fns, Resend

## Key paths

| Area | Path |
| --- | --- |
| DNS engine | `src/lib/dns-check.ts` |
| Change detection | `src/lib/change-detector.ts` |
| Alert dispatcher (Resend / Slack / Twilio WhatsApp / HMAC webhook) | `src/lib/alert-sender.ts` |
| Monitoring service (check → snapshot → diff → events → alerts) | `src/lib/monitor.ts` |
| Public instant scan (no login, nothing stored) | `POST /api/scan` |
| Add domain + baseline scan | `POST /api/check` |
| Domains list / detail / recheck | `GET /api/domains`, `GET|PATCH|DELETE /api/domains/[id]`, `POST /api/domains/[id]/recheck` |
| Alert channels CRUD + test | `GET|POST /api/alerts`, `PATCH|DELETE|POST /api/alerts/[id]` |
| Scheduled sweep | `GET|POST /api/cron/check-all` (Bearer `CRON_SECRET`), schedule in `vercel.json` |
| UI | `/` landing, `/login`, `/dashboard`, `/dashboard/[id]`, `/dashboard/alerts`, `/dashboard/settings` |

## Setup

```bash
cp .env.example .env      # fill in keys as needed
npx drizzle-kit push      # create tables
npm run dev
```

Only `DATABASE_URL` is required. Slack and generic webhooks work with no extra keys; email needs `RESEND_API_KEY`, WhatsApp needs the Twilio variables. In production set `CRON_SECRET` so only your scheduler can trigger `/api/cron/check-all`.
