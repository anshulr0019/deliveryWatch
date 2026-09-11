"use client";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
function VerifyForm() {
  const params = useSearchParams();
  const [message, setMessage] = useState(""); const [busy, setBusy] = useState(false); const [done, setDone] = useState(false);
  return <main className="mx-auto max-w-md px-6 py-24">
    <h1 className="text-3xl font-bold">Verify your email</h1>
    <p className="mt-4 text-slate-600">Confirm that you requested a DeliveryWatch account with this email address.</p>
    <button className="btn-primary mt-6" disabled={busy || done || !params.get("token")} onClick={async () => {
      setBusy(true);
      try {
        const res = await fetch("/api/auth/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token: params.get("token") }) });
        const data = await res.json(); if (!res.ok) throw new Error(data.error); setDone(true); setMessage("Email verified. You can now sign in.");
      } catch (error) { setMessage(error instanceof Error ? error.message : "Verification failed. Try again."); } finally { setBusy(false); }
    }}>{busy ? "Verifying…" : "Confirm email address"}</button>
    <p role="status" className="mt-4 text-sm">{message || (!params.get("token") ? "Open the link from your verification email." : "")}</p>
    <Link href="/login" className="mt-6 inline-block text-emerald-800 underline">Back to sign in</Link>
  </main>;
}
export default function VerifyPage() { return <Suspense fallback={<p className="p-10">Loading verification…</p>}><VerifyForm /></Suspense>; }
