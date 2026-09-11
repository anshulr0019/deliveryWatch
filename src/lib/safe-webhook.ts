import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { request } from "node:https";

export function isPublicAddress(address: string): boolean {
  if (isIP(address) === 4) {
    const [a, b] = address.split(".").map(Number);
    return !(a === 0 || a === 10 || a === 127 || a >= 224 ||
      (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) || (a === 192 && (b === 0 || b === 168)) ||
      (a === 198 && (b === 18 || b === 19 || b === 51)) || (a === 203 && b === 0));
  }
  // Only global unicast IPv6; exclude documentation and transition ranges.
  if (isIP(address) === 6) {
    const first = parseInt(address.split(":")[0], 16);
    return first >= 0x2000 && first <= 0x3fff && first !== 0x2002 &&
      !(first === 0x2001 && (parseInt(address.split(":")[1] || "0", 16) < 0x200 || parseInt(address.split(":")[1], 16) === 0xdb8));
  }
  return false;
}

export function parseWebhookUrl(raw: string): URL {
  const url = new URL(raw);
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (url.protocol !== "https:" || url.username || url.password || url.hash || (url.port && url.port !== "443") ||
      !host.includes(".") && !isIP(host) || (isIP(host) && !isPublicAddress(host))) {
    throw new Error("Use a public HTTPS webhook URL on port 443, without credentials or a fragment.");
  }
  return url;
}

export async function resolveWebhook(raw: string) {
  const url = parseWebhookUrl(raw);
  const host = url.hostname.replace(/^\[|\]$/g, "");
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const addresses = await Promise.race([
      lookup(host, { all: true }),
      new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error("Webhook DNS lookup timed out.")), 3000); }),
    ]);
    if (!addresses.length || addresses.some(({ address }) => !isPublicAddress(address))) throw new Error("Webhook must resolve only to public IP addresses.");
    return { url, address: addresses[0] };
  } finally { clearTimeout(timer); }
}

/** Pin the validated IP for this connection, preserve TLS hostname validation, never follow redirects. */
export async function postWebhook(raw: string, body: string, headers: Record<string, string>): Promise<{ ok: boolean; reason?: string }> {
  const { url, address } = await resolveWebhook(raw);
  return new Promise((resolve, reject) => {
    const req = request(url, {
      method: "POST", agent: false, family: address.family, headers,
      lookup: (_host, _options, callback) => callback(null, address.address, address.family),
    }, (res) => {
      const status = res.statusCode ?? 0;
      res.resume();
      res.on("end", () => resolve({ ok: status >= 200 && status < 300, reason: status >= 200 && status < 300 ? undefined : `Endpoint responded ${status}` }));
      res.on("error", reject);
    });
    const timer = setTimeout(() => req.destroy(new Error("Webhook request timed out.")), 8000);
    req.on("close", () => clearTimeout(timer));
    req.on("error", reject);
    req.end(body);
  });
}
