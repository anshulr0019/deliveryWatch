/** Runtime validation shared by JSON API routes. */
export async function readObject(req: Request): Promise<Record<string, unknown> | Response> {
  if (!req.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return Response.json({ error: "Content-Type must be application/json." }, { status: 415 });
  }
  const reader = req.body?.getReader();
  if (!reader) return Response.json({ error: "A JSON object is required." }, { status: 400 });
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 8192) {
        await reader.cancel();
        return Response.json({ error: "Request body is too large." }, { status: 413 });
      }
      chunks.push(value);
    }
    const body: unknown = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("object required");
    return body as Record<string, unknown>;
  } catch {
    return Response.json({ error: "A valid JSON object is required." }, { status: 400 });
  } finally {
    reader.releaseLock();
  }
}

export function safeNext(value: unknown): string {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//") || /[\\\u0000-\u0020]/.test(value)) return "/dashboard";
  try {
    const url = new URL(value, "https://deliverywatch.invalid");
    return url.origin === "https://deliverywatch.invalid" ? url.pathname + url.search + url.hash : "/dashboard";
  } catch { return "/dashboard"; }
}
