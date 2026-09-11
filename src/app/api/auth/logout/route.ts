import { clearSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
  await clearSession();
  return Response.json({ ok: true });

  } catch (error) {
    console.error("[api] Request failed", error);
    return Response.json({ error: "Service temporarily unavailable. Please try again." }, { status: 503 });
  }
}
