# DeliveryWatch

DeliveryWatch monitors email DNS configuration and IPv4 blacklist observations. It combines a public scanner with authenticated domain histories, record-change detection, a durable notification queue, and an evidence-based Copilot for guided investigation and verification.

**A DNS health score is not an inbox-placement prediction.** This project does not send placement-test messages, provision mailboxes, isolate mail infrastructure, or guarantee delivery rates.

Alert channels are email (Resend), Slack incoming webhooks, and signed generic webhooks.

## Run locally

Requires Node.js 22+ and PostgreSQL. Node 22 LTS is recommended.

```sh
npm ci
cp .env.example .env.local
# Configure DATABASE_URL, NEXT_PUBLIC_SITE_URL and email/OAuth credentials.
npm run db:migrate
npm run dev
```

Open http://localhost:3000. Password accounts require email verification through Resend. Configure a verified `ALERT_FROM_EMAIL` sender. Google sign-in requires a verified Google email and the callback `/api/auth/google/callback` registered for the exact site URL. Google identities are not automatically linked to existing password accounts using email alone.

`npm run db:migrate` applies versioned SQL migrations and records them in `deliverywatch_migrations`. It supports a fresh database and the original DeliveryWatch schema. Take a database backup before production upgrades. No deployment is performed by this command.

## Validation

```sh
npm test
npm run lint
npm run typecheck
npm run build
```

Tests use a disposable PGlite PostgreSQL database, actual application route handlers and Drizzle queries. DNS, email transport and webhook transport are stubbed: **tests do not send messages or touch the configured database**. Coverage includes account verification, login/logout, ownership enforcement, domain/channel CRUD, retry persistence, scan leases, malformed inputs, DNS edge cases, and webhook destination protection.

## Routes

| Route | Purpose |
| --- | --- |
| `/` | Public scanner and product overview |
| `/login`, `/verify-email` | Account access and email confirmation |
| `/dashboard` | Monitored domains and recent events |
| `/dashboard/[id]` | Domain evidence and up to 90 days of history |
| `/dashboard/alerts` | Channels, test delivery and recent delivery attempts |
| `/dashboard/settings` | Account, usage and scheduler information |
| `/settings`, `/settings/alerts` | Legacy redirects |
| `POST /api/scan` | Public DNS scan; observations are not stored |
| `POST /api/check` | Add domain, scan and record baseline |
| `GET /api/domains` | List the current account's domains |
| `GET/PATCH/DELETE /api/domains/[id]` | Read, pause/resume, remove domain |
| `POST /api/domains/[id]/recheck` | Manual scan, change detection and alert enqueue |
| `GET/PATCH/POST /api/domains/[id]/copilot` | Explain evidence, save setup context, manage investigations and verify fixes |
| `GET/POST /api/alerts` | List/create channels |
| `PATCH/DELETE/POST /api/alerts/[id]` | Toggle/delete/test a channel |
| `POST /api/auth/signup`, `/login`, `/logout` | Password authentication |
| `POST /api/auth/verify`, `/resend-verification` | Email verification |
| `GET /api/auth/google`, `/api/auth/google/callback` | Google OAuth |
| `GET/POST /api/cron/check-all` | Authenticated due-domain sweep and delivery retries |
| `GET /api/health` | Minimal database health; 503 when unavailable |

Scan requests accept `domain`, an optional `dkimSelectors` array (up to five), and an optional `sendingIp` IPv4 address. These options are saved when a domain is added. Public scans still update an anonymous rate-limit counter, but do not store the scanned domain or result.

## What the engine can establish

- **SPF:** structural checks, duplicate records, include/redirect existence and cycles, address syntax, and recursive lookup-mechanism budget. Sender-dependent macros, `a`, `mx`, `ptr` and `exists` require an SMTP identity for full evaluation and are labeled unknown. This is not a complete RFC 7208 `check_host` implementation.
- **DKIM:** common or explicitly configured selectors; RSA keys are parsed cryptographically, Ed25519 is evaluated separately, and key fingerprints support drift detection. Discovery does not prove messages are signed. A miss on guessed selectors is unknown.
- **DMARC:** published record/policy checks; this does not evaluate message alignment or provide a complete organizational-domain policy discovery implementation.
- **MX:** explicit routing records and primary-host address resolution. A single MX is not automatically treated as broken.
- **Reputation:** configured outbound IPv4, or explicitly labeled inbound MX IPv4. No fallback to a website IP. Each provider is listed, clear or unavailable; blocked/error replies and DNS transport failures are never treated as clean. SORBS is excluded from the provider list.
- **Partial observations:** unknown checks contribute no points, so a partial score is a lower-bound summary, not a diagnosis of failure. No score-drop alert is generated from unknown protocol observations. Record comparisons use the latest known protocol baseline after an outage.

## DeliveryWatch Copilot

Copilot organizes the latest deterministic scan into a plain-language explanation, compares it with the previous observation, and prepares safe fix steps for SPF, DKIM, DMARC, MX and reputation findings. Users can save their DNS provider, email services, sending purpose and private notes so guidance uses confirmed setup context instead of guessing provider values.

Opening a fix plan creates a persisted investigation containing the source check, evidence and recommended action. A resolution note records what the user changed without marking the issue resolved. **Verify fix** runs a fresh DNS scan and separately records whether the original issue is resolved, still present, changed or unavailable. Alerts link directly to the Copilot investigation area, and recovery observations can generate recovery notifications.

The current release uses reviewed provider guidance and deterministic rules, so it requires no paid model API. It does not yet use embeddings, pgvector or an external LLM. The existing DNS engine remains the only source of pass/fail status and scores.

DNS answers are observations from the runtime resolver. Provider access policies can restrict DNSBL queries. For operational use, validate access with each provider and configure a supported resolver/service agreement. IPv6 reputation and seed-inbox placement testing are not implemented.

## Monitoring and alert reliability

`vercel.json` schedules one daily sweep at 00:00 UTC for Vercel Hobby compatibility. An external scheduler can call the same endpoint more frequently with `Authorization: Bearer <CRON_SECRET>` if a shorter interval is needed. Local `next dev` does not run scheduled sweeps automatically. See [Vercel cron limits](https://vercel.com/docs/cron-jobs/usage-and-pricing).

Domains persist their next due time and lease token. Overlapping scans are rejected. A scan transaction atomically commits the snapshot, detected events, latest score and pending delivery records. A bounded cron sweep leaves remaining due domains for a subsequent invocation; it is not an unlimited-scale queue worker or a strict execution-time SLA.

Deliveries are processed after manual scans and by scheduled sweeps. Failed sends retry up to five attempts using persisted next-attempt timestamps. Disabled/removed channels cancel queued delivery. The alert page shows pending, sent, failed and cancelled records. `sent` means provider acceptance, not confirmed receipt.

Delivery is **at least once**: a crash after sending but before saving the outcome can duplicate a message. Webhook consumers should deduplicate `X-DeliveryWatch-Delivery`; Resend receives the same delivery ID as its idempotency key. Webhook signatures use HMAC-SHA256 over the exact JSON body. Slack delivery is retried using the persisted delivery record.

Webhooks require public HTTPS destinations on port 443, validate all resolved addresses, pin the validated address for the connection, retain TLS hostname validation and refuse redirects. Provider sends have bounded network timeouts.

## Environment

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string |
| `NEXT_PUBLIC_SITE_URL` | Absolute site URL, including `http://` or `https://` |
| `CRON_SECRET` | Required for every scheduled sweep, including local development |
| `RESEND_API_KEY`, `ALERT_FROM_EMAIL` | Verification emails and email alerts |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Google OAuth |
| `TRUST_PROXY` | Set `true` only behind a proxy that overwrites `X-Forwarded-For`; Vercel uses its platform header |

Rate limits are stored in PostgreSQL so separate server instances share limits. Untrusted proxy environments use a conservative shared anonymous bucket. Limits are safeguards, not a substitute for a platform firewall. Password recovery, explicit account linking and configurable notification preferences remain future improvements.

## Architecture

- Next.js App Router, React, TypeScript and Tailwind
- PostgreSQL with Drizzle and versioned SQL migrations
- Salted asynchronous scrypt password hashing; hashed session and verification tokens
- `src/lib/dns-check.ts`: DNS observations and bounded structural audits
- `src/lib/change-detector.ts`: protocol drift and listing comparisons
- `src/lib/copilot.ts`: evidence explanations, provider guidance and safe fix plans
- `src/lib/monitor.ts`: per-domain leases and transactional persistence
- `src/lib/alert-outbox.ts`: durable delivery claims/retries
- `src/lib/safe-webhook.ts`: validated outbound webhook connections

For a showcase, demonstrate: verified sign-in → add a domain with a known selector → inspect the evidence → change a controlled record → recheck → inspect the event and delivery record. Use only a domain you control for the change demonstration.
