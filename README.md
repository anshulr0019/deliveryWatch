# DeliveryWatch

**Continuous Deliverability & Blacklist Monitoring — 100% Free.**

The MailScore instant checker, upgraded into a SaaS: accounts, unlimited monitored domains, 15‑minute re‑checks, history charts, change detection and WhatsApp / Slack / email / webhook alerts. No Stripe, no plans, no limits.

## Stack

- **Framework**: Next.js 16 (App Router) · React 19 · Tailwind v4
- **Database**: PostgreSQL via Drizzle ORM (`src/db/schema.ts`)
- **Authentication**: First‑party auth with scrypt password hashes + httpOnly session cookies + Google OAuth (`src/lib/auth.ts`)
- **DNS Engine**: Real DNS resolver in `src/lib/dns-check.ts` — SPF, DKIM (multi‑selector), DMARC, MX, and 8 RBL providers
- **Alerts**: Resend (email), Slack webhooks, Twilio WhatsApp, generic HMAC‑signed webhooks
- **UI Libraries**: Recharts, lucide-react, date-fns, Framer Motion

## Key Paths

| Area | Path |
| --- | --- |
| DNS engine | `src/lib/dns-check.ts` |
| Change detection | `src/lib/change-detector.ts` |
| Alert dispatcher (Resend / Slack / Twilio WhatsApp / HMAC webhook) | `src/lib/alert-sender.ts` |
| Monitoring service (check → snapshot → diff → events → alerts) | `src/lib/monitor.ts` |
| Auth (passwords, sessions, cookies) | `src/lib/auth.ts` |
| Route protection proxy | `src/proxy.ts` |
| Public instant scan (no login, nothing stored) | `POST /api/scan` |
| Add domain + baseline scan | `POST /api/check` |
| Domains list / detail / recheck | `GET /api/domains`, `GET\|PATCH\|DELETE /api/domains/[id]`, `POST /api/domains/[id]/recheck` |
| Alert channels CRUD + test | `GET\|POST /api/alerts`, `PATCH\|DELETE\|POST /api/alerts/[id]` |
| Scheduled sweep | `GET\|POST /api/cron/check-all` (Bearer `CRON_SECRET`), schedule in `vercel.json` |
| Auth endpoints | `POST /api/auth/login`, `POST /api/auth/signup`, `POST /api/auth/logout`, `GET /api/auth/google` |

## Pages

| Route | Description |
| --- | --- |
| `/` | Landing page with hero, instant checker, feature grid, and CTA |
| `/login` | Sign in / Create account (email + password, Google OAuth) |
| `/dashboard` | Overview: domain list, stats, recent activity |
| `/dashboard/[id]` | Domain detail: score gauge, history chart, protocol breakdown, audit log |
| `/dashboard/alerts` | Alert channels manager: add, test, toggle, remove channels |
| `/dashboard/settings` | Account profile, plan features, usage stats, monitoring scheduler |

## Setup

### Prerequisites

- Node.js 18+
- PostgreSQL database (we recommend [Supabase](https://supabase.com) — free tier works great)

### 1. Clone and install

```bash
git clone <repo-url>
cd deliveryWatch
npm install
```

### 2. Configure environment variables

```bash
cp .env.example .env.local
```

Fill in the following variables:

| Variable | Required | Description |
| --- | --- | --- |
| `DATABASE_URL` | ✅ Yes | PostgreSQL connection string |
| `NEXT_PUBLIC_SITE_URL` | ✅ Yes | Your app URL (e.g., `http://localhost:3000` for dev) |
| `CRON_SECRET` | Production | Secret for authenticating cron job requests |
| `RESEND_API_KEY` | For email alerts | API key from [Resend](https://resend.com) |
| `ALERT_FROM_EMAIL` | For email alerts | Sender address (e.g., `DeliveryWatch <onboarding@resend.dev>`) |
| `GOOGLE_CLIENT_ID` | For Google OAuth | Google Cloud Console OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | For Google OAuth | Google Cloud Console OAuth client secret |
| `TWILIO_ACCOUNT_SID` | For WhatsApp alerts | Twilio Account SID |
| `TWILIO_AUTH_TOKEN` | For WhatsApp alerts | Twilio Auth Token |
| `TWILIO_WHATSAPP_NUMBER` | For WhatsApp alerts | Twilio WhatsApp sender number |

### 3. Create database tables

```bash
npx drizzle-kit push
```

### 4. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deployment (Vercel)

### 1. Push to GitHub

```bash
git add -A
git commit -m "Ready for production"
git push origin main
```

### 2. Deploy

Either:
- Push to `main` branch (auto-deploys if connected to Vercel)
- Or run `vercel --prod` via the [Vercel CLI](https://vercel.com/cli)

### 3. Set environment variables

In the Vercel dashboard → Project Settings → Environment Variables, add all variables from the table above.

### 4. Verify cron schedule

The `vercel.json` file configures a cron job that runs every 15 minutes:

```json
{
  "crons": [{
    "path": "/api/cron/check-all",
    "schedule": "*/15 * * * *"
  }]
}
```

This only runs on the **Production** deployment. Make sure `CRON_SECRET` is set.

## Available Scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Run TypeScript type checking |

## Architecture

```
src/
├── app/                    # Next.js App Router pages & API routes
│   ├── api/                # REST API endpoints
│   │   ├── alerts/         # Alert channel CRUD + test
│   │   ├── auth/           # Login, signup, logout, Google OAuth
│   │   ├── check/          # Add domain + initial scan
│   │   ├── cron/           # Scheduled sweep worker
│   │   ├── domains/        # Domain CRUD + recheck
│   │   ├── health/         # Health check endpoint
│   │   └── scan/           # Public instant scan (no auth)
│   ├── dashboard/          # Protected dashboard pages
│   │   ├── [id]/           # Domain detail page
│   │   ├── alerts/         # Alert channels page
│   │   └── settings/       # Account settings page
│   ├── login/              # Authentication page
│   └── page.tsx            # Landing page
├── components/
│   ├── dashboard/          # Dashboard-specific components
│   └── mailscore/          # Shared UI components
├── db/                     # Database configuration & schema
├── lib/                    # Core business logic
│   ├── alert-sender.ts     # Multi-channel alert dispatcher
│   ├── auth.ts             # Session & password management
│   ├── change-detector.ts  # DNS change diffing engine
│   ├── dns-check.ts        # Real DNS resolution engine
│   ├── monitor.ts          # Orchestrates check → diff → alert
│   └── score-ui.ts         # Score display utilities
└── proxy.ts                 # Edge route protection (Next.js 16 proxy)
```

## License

Private — All rights reserved.
