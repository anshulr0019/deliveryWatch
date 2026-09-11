"use client";

import { safeNext } from "@/lib/request";
import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Loader2, Lock, Mail, User } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

type Mode = "signin" | "signup";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [mode, setMode] = useState<Mode>(params.get("mode") === "signup" ? "signup" : "signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const next = safeNext(params.get("next"));

  const getInitialError = () => {
    const code = params.get("error");
    if (!code) return null;
    switch (code) {
      case "account_link_required":
        return "An account with this email already exists. Sign in with your password.";
      case "google_not_configured":
        return "Google sign-in is currently unavailable. Please use email and password.";
      case "oauth_cancelled":
        return "Google sign-in was cancelled.";
      case "state_mismatch":
      case "state_invalid":
      case "state_missing":
        return "Security state mismatch or session expired. Please try again.";
      case "token_exchange_failed":
      case "userinfo_failed":
        return "Google authorization failed. Please try again.";
      default:
        return "Sign-in with Google failed. Please try again.";
    }
  };

  const [error, setError] = useState<string | null>(getInitialError());
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
      if (data.verificationRequired) { setNotice(data.message); setMode("signin"); setLoading(false); return; }
      router.push(next);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  };

  return (
    <div className="w-full rounded-3xl border border-white/85 bg-white/80 p-7 shadow-[0_20px_50px_rgba(15,55,46,0.06),0_1px_2px_rgba(0,0,0,0.03)] backdrop-blur-2xl sm:p-9 font-apple">
      {notice && <p role="status" className="mb-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900">{notice}</p>}
      {/* Smooth Glass Segmented Mode Switcher */}
      <div className="relative mb-6 grid grid-cols-2 rounded-xl bg-slate-200/50 p-1 text-xs font-medium backdrop-blur-md border border-white/60">
        {(["signin", "signup"] as Mode[]).map((m) => {
          const isActive = mode === m;
          return (
            <button
              key={m}
              type="button"
              onClick={() => {
                setMode(m);
                setError(null);
              }}
              className={`relative z-10 cursor-pointer rounded-lg py-2 text-center text-xs font-semibold transition-colors duration-200 ${
                isActive ? "text-[#1d1d1f]" : "text-[#86868b] hover:text-[#1d1d1f]"
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="activeAuthTab"
                  className="absolute inset-0 -z-10 rounded-lg bg-white/95 shadow-[0_2px_8px_rgba(0,0,0,0.07),0_0.5px_1px_rgba(0,0,0,0.04)] border border-white/80"
                  transition={{ type: "spring", stiffness: 500, damping: 38 }}
                />
              )}
              {m === "signin" ? "Sign In" : "Create Account"}
            </button>
          );
        })}
      </div>

      {/* Header with smooth crossfade */}
      <div className="min-h-[58px]">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={mode}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
          >
            <h2 className="text-2xl font-semibold tracking-[-0.025em] text-[#1d1d1f]">
              {mode === "signin" ? "Welcome back" : "Start monitoring — free"}
            </h2>
            <p className="mt-1 text-[13px] leading-snug text-[#86868b]">
              {mode === "signin"
                ? "Sign in to your DeliveryWatch dashboard."
                : "Unlimited domains, 15-minute re-checks, alerts on Slack, email & webhooks."}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Error notification banner */}
      {error && (
        <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-semibold text-rose-700">
          {error}
        </div>
      )}

      {/* Google Auth Button */}
      <div className="mt-5">
        <a
          href={`/api/auth/google?next=${encodeURIComponent(next)}`}
          className="flex w-full h-11 items-center justify-center gap-2.5 rounded-xl border border-slate-200/80 bg-white/85 px-4 text-xs font-semibold text-[#1d1d1f] shadow-sm backdrop-blur-sm transition-all hover:bg-white hover:shadow hover:border-slate-300 active:scale-[0.99] cursor-pointer"
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
          <span>Continue with Google</span>
        </a>
      </div>

      {/* Divider */}
      <div className="relative my-5 flex items-center justify-center">
        <div className="w-full border-t border-slate-200/70" />
        <span className="absolute bg-white/90 px-3 text-[10px] font-semibold uppercase tracking-wider text-[#86868b] backdrop-blur-sm rounded-full">
          Or continue with email
        </span>
      </div>

      <form onSubmit={submit} className="space-y-3.5">
        <AnimatePresence initial={false}>
          {mode === "signup" && (
            <motion.div
              key="fullname-field"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="overflow-hidden"
            >
              <label className="block pt-0.5">
                <span className="mb-1.5 block text-xs font-medium text-[#1d1d1f]">Full name (optional)</span>
                <div className="relative">
                  <User className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full rounded-xl border border-slate-200/90 bg-white/80 py-2.5 pl-10 pr-3.5 text-[13px] text-[#1d1d1f] placeholder:text-[#86868b] shadow-sm backdrop-blur-sm transition-all focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    placeholder="Ada Lovelace"
                    autoComplete="name"
                  />
                </div>
              </label>
            </motion.div>
          )}
        </AnimatePresence>

        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-[#1d1d1f]">Work Email</span>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-slate-200/90 bg-white/80 py-2.5 pl-10 pr-3.5 text-[13px] text-[#1d1d1f] placeholder:text-[#86868b] shadow-sm backdrop-blur-sm transition-all focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              placeholder="you@company.com"
              autoComplete="email"
            />
          </div>
        </label>

        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-[#1d1d1f]">Password</span>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-slate-200/90 bg-white/80 py-2.5 pl-10 pr-3.5 text-[13px] text-[#1d1d1f] placeholder:text-[#86868b] shadow-sm backdrop-blur-sm transition-all focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              placeholder={mode === "signup" ? "At least 8 characters" : "••••••••"}
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
            />
          </div>
        </label>

        <button
          type="submit"
          disabled={loading}
          className="group relative flex w-full h-11 items-center justify-center gap-2 rounded-xl bg-[#0F372E] hover:bg-[#164B3F] active:bg-[#0B2720] text-xs font-semibold text-white shadow-[0_4px_14px_rgba(15,55,46,0.18)] transition-all hover:shadow-[0_6px_20px_rgba(15,55,46,0.24)] active:scale-[0.99] disabled:opacity-60 cursor-pointer mt-2"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin text-white" />}
          <span>
            {loading ? "Please wait…" : mode === "signin" ? "Sign in to DeliveryWatch" : "Create Free Account"}
          </span>
          {!loading && (
            <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
          )}
        </button>
      </form>

      <div className="mt-5 text-center text-xs text-[#86868b]">
        {mode === "signin" ? (
          <>
            Don&apos;t have an account?{" "}
            <button
              type="button"
              onClick={() => setMode("signup")}
              className="cursor-pointer font-medium text-[#0F372E] hover:underline"
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
              className="cursor-pointer font-medium text-[#0F372E] hover:underline"
            >
              Sign in
            </button>
          </>
        )}
      </div>
      <button type="button" className="mt-4 text-xs text-emerald-800 underline" disabled={loading || !email} onClick={async () => {
        setLoading(true); setError(null);
        try {
          const res = await fetch("/api/auth/resend-verification", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
          const data = await res.json(); if (!res.ok) throw new Error(data.error); setNotice(data.message);
        } catch (error) { setError(error instanceof Error ? error.message : "Please try again."); } finally { setLoading(false); }
      }}>Resend verification email</button>
    </div>
  );
}
