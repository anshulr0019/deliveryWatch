import { checkDomain, normalizeDomain } from "@/lib/dns-check";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * Public lead-magnet endpoint: instant check, nothing persisted, no login required.
 */
export async function POST(req: Request) {
  let body: { domain?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const domain = normalizeDomain(body.domain ?? "");
  if (!domain) return Response.json({ error: "Please enter a valid domain like example.com" }, { status: 400 });

  try {
    const result = await checkDomain(domain);
    return Response.json(result);
  } catch (err) {
    console.error("[scan] failed", err);
    return Response.json({ error: "Scan failed. Please try again." }, { status: 500 });
  }
}
