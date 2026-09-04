"use client";

import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Loader2, Lock, Mail, User } from "lucide-react";

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
    <div className="w-full rounded-2xl border border-slate-200/90 bg-white p-7 shadow-lg sm:p-9">
      {/* Mode switcher tabs */}
      <div className="mb-6 grid grid-cols-2 rounded-xl bg-slate-100 p-1 text-sm font-semibold">
        {(["signin", "signup"] as Mode[]).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => {
              setMode(m);
              setError(null);
            }}
            className={`cursor-pointer rounded-lg py-2 text-center transition ${
              mode === m
                ? "bg-white text-[#0F372E] shadow-sm font-bold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            {m === "signin" ? "Sign In" : "Create Account"}
          </button>
        ))}
      </div>

      <div>
        <h1 className="font-display text-2xl font-extrabold text-[#0B1311]">
          {mode === "signin" ? "Welcome back" : "Start monitoring — free"}
        </h1>
        <p className="mt-1.5 text-sm text-slate-500">
          {mode === "signin"
            ? "Sign in to your DeliverWatch dashboard."
            : "Unlimited domains, 15-minute re-checks, alerts on WhatsApp, Slack & email."}
        </p>
      </div>

      {/* Google Auth Button Mock */}
      <div className="mt-6">
        <button
          type="button"
          onClick={() => alert("Google OAuth can be connected via your identity provider.")}
          className="btn-secondary w-full !h-11 justify-center gap-2.5 !rounded-xl !border-slate-200 hover:!bg-slate-50"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span className="text-sm font-semibold text-slate-700">Continue with Google</span>
        </button>
      </div>

      {/* Divider */}
      <div className="relative my-6 flex items-center justify-center">
        <div className="w-full border-t border-slate-200" />
        <span className="absolute bg-white px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Or continue with email
        </span>
      </div>

      <form onSubmit={submit} className="space-y-4">
        {mode === "signup" && (
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-slate-700">Full name (optional)</span>
            <div className="relative">
              <User className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="input-domain !pl-11"
                placeholder="Ada Lovelace"
                autoComplete="name"
              />
            </div>
          </label>
        )}

        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold text-slate-700">Work Email</span>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-domain !pl-11"
              placeholder="you@company.com"
              autoComplete="email"
            />
          </div>
        </label>

        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold text-slate-700">Password</span>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-domain !pl-11"
              placeholder={mode === "signup" ? "At least 8 characters" : "••••••••"}
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
            />
          </div>
        </label>

        {error && (
          <p className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-semibold text-rose-700">
            {error}
          </p>
        )}

        <button type="submit" disabled={loading} className="btn-primary w-full !h-12 mt-2">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          <span>{loading ? "Please wait…" : mode === "signin" ? "Sign in to DeliverWatch" : "Create Free Account"}</span>
          {!loading && <ArrowRight className="h-4 w-4" />}
        </button>
      </form>

      <p className="mt-6 text-center text-xs text-slate-500">
        {mode === "signin" ? (
          <>
            Don&apos;t have an account?{" "}
            <button
              type="button"
              onClick={() => setMode("signup")}
              className="cursor-pointer font-bold text-[#0F372E] hover:underline"
            >
              Create free account
            </button>
          </>
        ) : (
          <>
            Already have an account?{" "}
            <button
              type="button"
              onClick={() => setMode("signin")}
              className="cursor-pointer font-bold text-[#0F372E] hover:underline"
            >
              Sign in
            </button>
          </>
        )}
      </p>
    </div>
  );
}
