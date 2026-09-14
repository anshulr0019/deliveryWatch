import { after } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  checks,
  copilotInvestigations,
  domains,
  domainSetupProfiles,
  type Check,
  type CopilotInvestigation,
  type Domain,
} from "@/db/schema";
import { getCurrentUser, unauthorized } from "@/lib/auth";
import { drainAlertOutbox } from "@/lib/alert-outbox";
import {
  buildCopilotReport,
  findCopilotFinding,
  normalizeSetupProfile,
  type CopilotFinding,
  type CopilotProtocol,
  type CopilotReport,
  type CopilotSetupProfile,
} from "@/lib/copilot";
import {
  gradeFor,
  tierFor,
  type DkimResult,
  type DmarcResult,
  type MailScoreResult,
  type MxResult,
  type RblResult,
  type SpfResult,
} from "@/lib/dns-check";
import { CheckBusyError, runMonitoredCheck } from "@/lib/monitor";
import { rateLimit } from "@/lib/rate-limit";
import { readObject } from "@/lib/request";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Params = { params: Promise<{ id: string }> };
type SetupWithNotes = CopilotSetupProfile & { notes: string | null };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MUTATION_LIMIT = 20;
const MAX_SETUP_ITEMS = 20;
const MAX_SETUP_ITEM_LENGTH = 160;
const MAX_NOTES_LENGTH = 2000;

async function ownedDomain(id: string, userId: string): Promise<Domain | null> {
  if (!UUID_RE.test(id)) return null;
  const [domain] = await db
    .select()
    .from(domains)
    .where(and(eq(domains.id, id), eq(domains.userId, userId)))
    .limit(1);
  return domain ?? null;
}

function resultFromCheck(row: Check, domainName: string): MailScoreResult {
  return {
    domain: domainName,
    totalScore: row.score,
    grade: gradeFor(row.score),
    tier: tierFor(row.score),
    complete: [row.spfStatus, row.dkimStatus, row.dmarcStatus, row.mxStatus, row.rblStatus].every(
      (status) => status !== "unknown",
    ),
    spf: row.spfDetails as SpfResult,
    dkim: row.dkimDetails as DkimResult,
    dmarc: row.dmarcDetails as DmarcResult,
    mx: row.mxDetails as MxResult,
    rbl: row.rblDetails as RblResult,
    scannedAt: row.checkedAt.toISOString(),
    scanDurationMs: 0,
  };
}

function setupFromRow(
  row: typeof domainSetupProfiles.$inferSelect | undefined,
): SetupWithNotes {
  const normalized = normalizeSetupProfile(
    row
      ? {
          dnsProvider: row.dnsProvider,
          emailProviders: row.emailProviders,
          sendingPurposes: row.sendingPurposes,
          dkimSelectors: row.dkimSelectors,
          sendingIps: row.sendingIps,
        }
      : {},
  );
  return { ...normalized, notes: row?.notes ?? null };
}

function setupForClient(profile: SetupWithNotes) {
  return {
    ...profile,
    // Keep the aliases used by the initial dashboard form during the rollout.
    dnsProvider: profile.dnsProvider ?? "",
    emailServices: profile.emailProviders,
    sendingPurpose: profile.sendingPurposes.join(", "),
    notes: profile.notes ?? "",
  };
}

function validateSetup(input: unknown): SetupWithNotes | Response {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return Response.json({ error: "setupProfile must be an object." }, { status: 400 });
  }

  const raw = input as Record<string, unknown>;
  const aliases = {
    ...raw,
    emailProviders: raw.emailProviders ?? raw.emailServices,
    sendingPurposes:
      raw.sendingPurposes ??
      (typeof raw.sendingPurpose === "string" ? [raw.sendingPurpose] : raw.sendingPurpose),
  };

  let normalized: CopilotSetupProfile;
  try {
    normalized = normalizeSetupProfile(aliases);
  } catch {
    return Response.json({ error: "The setup profile contains invalid values." }, { status: 400 });
  }

  const lists = [
    normalized.emailProviders,
    normalized.sendingPurposes,
    normalized.dkimSelectors,
    normalized.sendingIps,
  ];
  if (
    (normalized.dnsProvider?.length ?? 0) > MAX_SETUP_ITEM_LENGTH ||
    lists.some(
      (items) =>
        items.length > MAX_SETUP_ITEMS || items.some((item) => item.length > MAX_SETUP_ITEM_LENGTH),
    )
  ) {
    return Response.json({ error: "The setup profile contains too many or overly long values." }, { status: 400 });
  }

  if (raw.notes !== undefined && raw.notes !== null && typeof raw.notes !== "string") {
    return Response.json({ error: "notes must be text." }, { status: 400 });
  }
  const notes = typeof raw.notes === "string" ? raw.notes.trim() : null;
  if ((notes?.length ?? 0) > MAX_NOTES_LENGTH) {
    return Response.json({ error: `notes must be ${MAX_NOTES_LENGTH} characters or fewer.` }, { status: 400 });
  }

  return { ...normalized, notes: notes || null };
}

function findingFromInvestigation(row: CopilotInvestigation): CopilotFinding | undefined {
  const report = row.report as CopilotReport;
  return findCopilotFinding(report, row.findingKey);
}

function investigationForClient(row: CopilotInvestigation) {
  const finding = findingFromInvestigation(row);
  const action =
    row.recommendedAction && typeof row.recommendedAction === "object"
      ? (row.recommendedAction as { prerequisites?: string[]; steps?: string[] })
      : {};
  const steps = action.steps ?? finding?.steps ?? [];
  const originalEvidence = Array.isArray(row.originalEvidence) ? row.originalEvidence : [];
  const references = (finding?.references ?? []).map((reference) => ({
    label: reference.title,
    href: reference.url,
  }));
  const evidence = originalEvidence.map((value, index) => {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      const item = value as Record<string, unknown>;
      return {
        label: typeof item.label === "string" ? item.label : `Evidence ${index + 1}`,
        value: typeof item.value === "string" ? item.value : JSON.stringify(value),
        href:
          typeof item.href === "string"
            ? item.href
            : typeof item.url === "string"
              ? item.url
              : undefined,
      };
    }
    return {
      label: `Evidence ${index + 1}`,
      value: typeof value === "string" ? value : JSON.stringify(value),
    };
  });

  return {
    id: row.id,
    domainId: row.domainId,
    findingId: row.findingKey,
    findingKey: row.findingKey,
    check: row.protocol,
    protocol: row.protocol,
    status: row.status,
    title: row.title,
    summary: finding?.explanation ?? row.title,
    whatChanged: finding?.changeSummary ?? "No comparison is available for this saved finding.",
    change: finding?.change ?? "unchanged",
    impact: finding?.impact ?? "Review the saved evidence before making a configuration change.",
    prerequisites: action.prerequisites ?? [],
    steps: steps.map((description, index) => ({
      id: `${row.id}-step-${index + 1}`,
      title: `Step ${index + 1}`,
      description,
    })),
    evidence,
    sources: references,
    references,
    resolutionNote: row.resolutionNote,
    verification: row.verificationResult,
    verifiedAt: row.verifiedAt,
    resolvedAt: row.resolvedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    sourceCheckId: row.sourceCheckId,
    verificationCheckId: row.verificationCheckId,
    finding,
  };
}

async function currentContext(domain: Domain) {
  const [setupRows, history] = await Promise.all([
    db.select().from(domainSetupProfiles).where(eq(domainSetupProfiles.domainId, domain.id)).limit(1),
    db
      .select()
      .from(checks)
      .where(eq(checks.domainId, domain.id))
      .orderBy(desc(checks.checkedAt))
      .limit(2),
  ]);
  const setup = setupFromRow(setupRows[0]);
  const current = history[0] ? resultFromCheck(history[0], domain.domain) : null;
  const previous = history[1] ? resultFromCheck(history[1], domain.domain) : null;
  const report = current ? buildCopilotReport(current, setup, previous) : null;
  return { setup, history, current, previous, report };
}

async function stateForDomain(domain: Domain) {
  const [context, saved] = await Promise.all([
    currentContext(domain),
    db
      .select()
      .from(copilotInvestigations)
      .where(eq(copilotInvestigations.domainId, domain.id))
      .orderBy(desc(copilotInvestigations.updatedAt))
      .limit(100),
  ]);
  return {
    setupProfile: setupForClient(context.setup),
    report: context.report,
    investigations: saved.map(investigationForClient),
  };
}

/** GET /api/domains/[id]/copilot — current explanation context and saved investigations. */
export async function GET(_req: Request, { params }: Params) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    const { id } = await params;
    const domain = await ownedDomain(id, user.id);
    if (!domain) return Response.json({ error: "Not found" }, { status: 404 });
    return Response.json(await stateForDomain(domain));
  } catch (error) {
    console.error("[copilot] read failed", error);
    return Response.json({ error: "Copilot is temporarily unavailable. Please try again." }, { status: 503 });
  }
}

/** PATCH /api/domains/[id]/copilot — create or update the domain's setup profile. */
export async function PATCH(req: Request, { params }: Params) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    const limited = await rateLimit("copilot-profile", user.id, MUTATION_LIMIT);
    if (limited) return limited;

    const { id } = await params;
    const domain = await ownedDomain(id, user.id);
    if (!domain) return Response.json({ error: "Not found" }, { status: 404 });

    const body = await readObject(req);
    if (body instanceof Response) return body;
    const setup = validateSetup(body.setupProfile);
    if (setup instanceof Response) return setup;

    await db
      .insert(domainSetupProfiles)
      .values({
        domainId: domain.id,
        dnsProvider: setup.dnsProvider,
        emailProviders: setup.emailProviders,
        sendingPurposes: setup.sendingPurposes,
        dkimSelectors: setup.dkimSelectors,
        sendingIps: setup.sendingIps,
        notes: setup.notes,
      })
      .onConflictDoUpdate({
        target: domainSetupProfiles.domainId,
        set: {
          dnsProvider: setup.dnsProvider,
          emailProviders: setup.emailProviders,
          sendingPurposes: setup.sendingPurposes,
          dkimSelectors: setup.dkimSelectors,
          sendingIps: setup.sendingIps,
          notes: setup.notes,
          updatedAt: new Date(),
        },
      });

    return Response.json(await stateForDomain(domain));
  } catch (error) {
    console.error("[copilot] profile update failed", error);
    return Response.json({ error: "Copilot is temporarily unavailable. Please try again." }, { status: 503 });
  }
}

/** POST /api/domains/[id]/copilot — explain, open, annotate, or verify an investigation. */
export async function POST(req: Request, { params }: Params) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    const limited = await rateLimit("copilot-action", user.id, MUTATION_LIMIT);
    if (limited) return limited;

    const { id } = await params;
    const domain = await ownedDomain(id, user.id);
    if (!domain) return Response.json({ error: "Not found" }, { status: 404 });

    const body = await readObject(req);
    if (body instanceof Response) return body;
    const action = body.action;

    if (action === "explain") {
      return Response.json(await stateForDomain(domain));
    }

    if (action === "open") {
      const findingKey = typeof body.findingId === "string" ? body.findingId : body.findingKey;
      if (typeof findingKey !== "string" || findingKey.length > 200) {
        return Response.json({ error: "Select a valid finding." }, { status: 400 });
      }

      const context = await currentContext(domain);
      if (!context.report || !context.history[0]) {
        return Response.json({ error: "Run a domain check before opening an investigation." }, { status: 409 });
      }
      const finding = findCopilotFinding(context.report, findingKey);
      if (!finding) return Response.json({ error: "Finding not found in the latest report." }, { status: 404 });
      if (finding.status === "pass") {
        return Response.json({ error: "This check is currently healthy." }, { status: 409 });
      }

      const [alreadyOpen] = await db
        .select()
        .from(copilotInvestigations)
        .where(
          and(
            eq(copilotInvestigations.domainId, domain.id),
            eq(copilotInvestigations.findingKey, finding.key),
            eq(copilotInvestigations.status, "open"),
          ),
        )
        .orderBy(desc(copilotInvestigations.updatedAt))
        .limit(1);

      let investigation = alreadyOpen;
      if (!investigation) {
        const prerequisites: string[] = [];
        if (!context.setup.dnsProvider) prerequisites.push("Confirm which provider hosts this domain's DNS zone.");
        if (
          ["spf", "dkim", "dmarc"].includes(finding.protocol) &&
          context.setup.emailProviders.length === 0
        ) {
          prerequisites.push("Confirm every service that is authorized to send mail for this domain.");
        }

        [investigation] = await db
          .insert(copilotInvestigations)
          .values({
            domainId: domain.id,
            sourceCheckId: context.history[0].id,
            previousCheckId: context.history[1]?.id ?? null,
            findingKey: finding.key,
            protocol: finding.protocol,
            title: finding.title,
            report: context.report,
            originalEvidence: finding.evidence,
            recommendedAction: {
              prerequisites,
              steps: finding.steps,
              references: finding.references,
            },
          })
          .onConflictDoUpdate({
            target: [copilotInvestigations.sourceCheckId, copilotInvestigations.findingKey],
            set: { updatedAt: new Date() },
          })
          .returning();
      }

      const state = await stateForDomain(domain);
      return Response.json(
        { ...state, investigation: investigationForClient(investigation) },
        { status: alreadyOpen ? 200 : 201 },
      );
    }

    if (action === "note") {
      const investigationId = body.investigationId;
      if (typeof investigationId !== "string" || !UUID_RE.test(investigationId)) {
        return Response.json({ error: "Investigation not found." }, { status: 404 });
      }
      if (typeof body.resolutionNote !== "string" || body.resolutionNote.trim().length > MAX_NOTES_LENGTH) {
        return Response.json({ error: `resolutionNote must be ${MAX_NOTES_LENGTH} characters or fewer.` }, { status: 400 });
      }

      const [updated] = await db
        .update(copilotInvestigations)
        .set({ resolutionNote: body.resolutionNote.trim() || null, updatedAt: new Date() })
        .where(
          and(
            eq(copilotInvestigations.id, investigationId),
            eq(copilotInvestigations.domainId, domain.id),
          ),
        )
        .returning();
      if (!updated) return Response.json({ error: "Investigation not found." }, { status: 404 });

      const state = await stateForDomain(domain);
      return Response.json({ ...state, investigation: investigationForClient(updated) });
    }

    if (action === "verify") {
      const investigationId = body.investigationId;
      if (typeof investigationId !== "string" || !UUID_RE.test(investigationId)) {
        return Response.json({ error: "Investigation not found." }, { status: 404 });
      }
      const [investigation] = await db
        .select()
        .from(copilotInvestigations)
        .where(
          and(
            eq(copilotInvestigations.id, investigationId),
            eq(copilotInvestigations.domainId, domain.id),
          ),
        )
        .limit(1);
      if (!investigation) return Response.json({ error: "Investigation not found." }, { status: 404 });

      try {
        const outcome = await runMonitoredCheck({
          domainId: domain.id,
          domainName: domain.domain,
          userId: user.id,
          sendAlerts: true,
        });
        after(async () => {
          await drainAlertOutbox(3, user.id).catch((error) =>
            console.error("[copilot] deferred alert delivery failed", error),
          );
        });

        const [sourceRows, setupRows] = await Promise.all([
          db
            .select()
            .from(checks)
            .where(
              and(
                eq(checks.id, investigation.sourceCheckId),
                eq(checks.domainId, domain.id),
              ),
            )
            .limit(1),
          db.select().from(domainSetupProfiles).where(eq(domainSetupProfiles.domainId, domain.id)).limit(1),
        ]);
        const source = sourceRows[0] ? resultFromCheck(sourceRows[0], domain.domain) : null;
        const setup = setupFromRow(setupRows[0]);
        const verificationReport = buildCopilotReport(outcome.result, setup, source);
        const currentFinding = findCopilotFinding(verificationReport, investigation.findingKey);
        const protocol = investigation.protocol as CopilotProtocol;
        const protocolStatus = outcome.result[protocol].status;
        const otherActiveFindings = verificationReport.findings.filter(
          (finding) =>
            finding.protocol === protocol &&
            finding.key !== investigation.findingKey &&
            (finding.status === "warn" || finding.status === "fail"),
        );

        let verificationStatus: "resolved" | "persists" | "changed" | "unavailable";
        let message: string;
        if (protocolStatus === "unknown") {
          verificationStatus = "unavailable";
          message = `${protocol.toUpperCase()} could not be observed reliably. Retry before changing DNS.`;
        } else if (currentFinding && (currentFinding.status === "warn" || currentFinding.status === "fail")) {
          verificationStatus = "persists";
          message = `${currentFinding.title} is still present in the fresh DNS check.`;
        } else if (otherActiveFindings.length) {
          verificationStatus = "changed";
          message = `The original finding is no longer present, but ${protocol.toUpperCase()} still needs attention.`;
        } else {
          verificationStatus = "resolved";
          message = `The original ${protocol.toUpperCase()} finding is no longer present in the fresh DNS check.`;
        }

        const verifiedAt = new Date();
        const verificationResult = {
          status: verificationStatus,
          message,
          scoreBefore: source?.totalScore ?? null,
          scoreAfter: outcome.result.totalScore,
          scoreDelta: source ? outcome.result.totalScore - source.totalScore : null,
          checkedAt: outcome.result.scannedAt,
          verifiedAt: verifiedAt.toISOString(),
          finding: currentFinding ?? null,
          relatedFindings: otherActiveFindings,
        };

        const [updated] = await db
          .update(copilotInvestigations)
          .set({
            status: verificationStatus === "resolved" ? "resolved" : "open",
            verificationCheckId: outcome.checkId,
            verificationResult,
            verifiedAt,
            resolvedAt: verificationStatus === "resolved" ? verifiedAt : null,
            updatedAt: verifiedAt,
          })
          .where(
            and(
              eq(copilotInvestigations.id, investigation.id),
              eq(copilotInvestigations.domainId, domain.id),
            ),
          )
          .returning();

        const state = await stateForDomain(domain);
        return Response.json({
          ...state,
          investigation: investigationForClient(updated),
          verification: verificationResult,
        });
      } catch (error) {
        if (error instanceof CheckBusyError) {
          return Response.json({ error: error.message }, { status: 409 });
        }
        console.error("[copilot] verification check failed", error);
        return Response.json({ error: "Verification failed. Please try again." }, { status: 500 });
      }
    }

    return Response.json({ error: "Unsupported Copilot action." }, { status: 400 });
  } catch (error) {
    console.error("[copilot] action failed", error);
    return Response.json({ error: "Copilot is temporarily unavailable. Please try again." }, { status: 503 });
  }
}
