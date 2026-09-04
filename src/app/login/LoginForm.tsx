"use client";

import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Loader2, Lock, Mail, User } from "lucide-react";
import { SpotlightCard } from "@/components/mailscore/SpotlightCard";

type Mode = "signin" | "signup";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [mode, setMode] = useState<Mode>(params.get("mode") === "signup" ? "signup" : "signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const next = params.get("next") && params.get("next")!.startsWith("/") ? params.get("next")! : "/dashboard";

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(mode === "signin" ? "/api/auth/login" : "/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mode === "signin" ? { email, password } : { email, password, fullName }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Something went wrong");
      router.push(next);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  };

  return (
    <SpotlightCard className="w-full max-w-md" borderGlowColor="rgba(200, 169, 110, 0.5)" innerClassName="p-7 sm:p-9">
      <div className="mb-6 grid grid-cols-2 rounded-xl border border-white/[0.08] bg-black/40 p-1 text-sm">
        {(["signin", "signup"] as Mode[]).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => {
              setMode(m);
              setError(null);
            }}
            className={`cursor-pointer rounded-lg px-3 py-2 font-medium transition ${
              mode === m ? "bg-gradient-to-br from-gold-light via-gold to-gold-deep text-obsidian shadow font-semibold" : "text-muted hover:text-white"
            }`}
          >
            {m === "signin" ? "Sign In" : "Create Free Account"}
          </button>
        ))}
      </div>

      <h1 className="font-display text-2xl font-semibold text-white">{mode === "signin" ? "Welcome back" : "Start monitoring — free"}</h1>
      <p className="mt-1 text-sm text-muted">
        {mode === "signin" ? "Sign in to your DeliverWatch dashboard." : "Unlimited domains, 15-minute re-checks, alerts on WhatsApp, Slack & email."}
      </p>

      <form onSubmit={submit} className="mt-6 space-y-4">
        {mode === "signup" && (
          <label className="block">
            <span className="mb-1.5 block text-xs text-muted">Full name (optional)</span>
            <div className="relative">
              <User className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-2" />
              <input value={fullName} onChange={(e) => setFullName(e.target.value)} className="input-dark !pl-11" placeholder="Ada Lovelace" autoComplete="name" />
            </div>
          </label>
        )}
        <label className="block">
          <span className="mb-1.5 block text-xs text-muted">Email</span>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-2" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-dark !pl-11"
              placeholder="you@company.com"
              autoComplete="email"
            />
          </div>
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs text-muted">Password</span>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-2" />
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-dark !pl-11"
              placeholder={mode === "signup" ? "At least 8 characters" : "••••••••"}
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
            />
          </div>
        </label>

        {error && <p className="rounded-xl border border-red-400/30 bg-red-400/10 px-3.5 py-2.5 text-sm text-red-200">{error}</p>}

        <button type="submit" disabled={loading} className="btn-gold w-full mt-2">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
          {loading ? "Please wait…" : mode === "signin" ? "Sign In" : "Create Free Account"}
        </button>
      </form>

      <p className="mt-5 text-center text-xs text-muted-2">
        {mode === "signin" ? (
          <>
            New here?{" "}
            <button type="button" onClick={() => setMode("signup")} className="cursor-pointer text-gold hover:text-gold-light font-medium">
              Create a free account
            </button>
          </>
        ) : (
          <>
            Already have an account?{" "}
            <button type="button" onClick={() => setMode("signin")} className="cursor-pointer text-gold hover:text-gold-light font-medium">
              Sign in
            </button>
          </>
        )}
      </p>
    </SpotlightCard>
  );
}
