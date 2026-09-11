import { rateLimit, requestIdentity } from "@/lib/rate-limit";
import { readObject } from "@/lib/request";
import { checkDomain, normalizeDomain, parseScanOptions } from "@/lib/dns-check";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * Public lead-magnet endpoint: instant check, nothing persisted, no login required.
 */
export async function POST(req: Request) {
  try {
  const body = await readObject(req);
  if (body instanceof Response) return body;

  const domain = normalizeDomain(body.domain ?? "");
  if (!domain) return Response.json({ error: "Please enter a valid domain like example.com" }, { status: 400 });

  let options;
  try { options = parseScanOptions(body); }
  catch (error) { return Response.json({ error: (error as Error).message }, { status: 400 }); }

  const limited = await rateLimit("scan", requestIdentity(req), 15);
  if (limited) return limited;

  try {
    const result = await checkDomain(domain, options);
    return Response.json(result);
  } catch (err) {
    console.error("[scan] failed", err);
    return Response.json({ error: "Scan failed. Please try again." }, { status: 500 });
  }

  } catch (error) {
    console.error("[api] Request failed", error);
    return Response.json({ error: "Service temporarily unavailable. Please try again." }, { status: 503 });
  }
}
