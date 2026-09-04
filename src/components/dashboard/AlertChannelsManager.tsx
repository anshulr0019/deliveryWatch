"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Bell, Hash, Loader2, Mail, MessageCircle, Plus, Send, Trash2, Webhook } from "lucide-react";
import { SpotlightCard } from "@/components/mailscore/SpotlightCard";

export type ChannelType = "email" | "slack" | "whatsapp" | "webhook";

export interface ChannelRow {
  id: string;
  type: ChannelType;
  config: Record<string, string>;
  isActive: boolean;
  createdAt: string;
}

const TYPE_META: Record<ChannelType, { label: string; icon: typeof Mail; field: string; placeholder: string; help: string }> = {
  email: { label: "Email", icon: Mail, field: "email", placeholder: "alerts@yourcompany.com", help: "HTML alert emails via Resend." },
  slack: { label: "Slack", icon: Hash, field: "webhookUrl", placeholder: "https://hooks.slack.com/services/T000/B000/XXXX", help: "Create an Incoming Webhook in your Slack workspace and paste the URL." },
  whatsapp: { label: "WhatsApp", icon: MessageCircle, field: "phone", placeholder: "+14155551234", help: "E.164 format. Delivered via the Twilio WhatsApp API." },
  webhook: { label: "Webhook", icon: Webhook, field: "url", placeholder: "https://api.yourapp.com/deliverwatch", help: "JSON POST with an optional HMAC-SHA256 signature header." },
};

function describe(c: ChannelRow) {
  switch (c.type) {
    case "email":
      return c.config.email;
    case "slack":
      return c.config.webhookUrl?.replace(/^https:\/\/hooks\.slack\.com\/services\//, "…/").slice(0, 40) + "…";
    case "whatsapp":
      return c.config.phone;
    case "webhook":
      return c.config.url;
  }
}

export function AlertChannelsManager({ initialChannels, userEmail, integrations }: { initialChannels: ChannelRow[]; userEmail: string; integrations: { email: boolean; whatsapp: boolean } }) {
  const router = useRouter();
  const [channels, setChannels] = useState(initialChannels);
  const [type, setType] = useState<ChannelType>("email");
  const [value, setValue] = useState(userEmail);
  const [secret, setSecret] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [testMsg, setTestMsg] = useState<Record<string, string>>({});

  const meta = TYPE_META[type];

  const changeType = (t: ChannelType) => {
    setType(t);
    setError(null);
    setValue(t === "email" ? userEmail : "");
  };

  const add = async (e: FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      const config: Record<string, string> = { [meta.field]: value };
      if (type === "webhook" && secret) config.secret = secret;
      const res = await fetch("/api/alerts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type, config }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to save channel");
      setChannels((c) => [{ ...data.channel, createdAt: new Date(data.channel.createdAt).toISOString() }, ...c]);
      setValue(type === "email" ? userEmail : "");
      setSecret("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save channel");
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (c: ChannelRow) => {
    setBusy(c.id);
    const res = await fetch(`/api/alerts/${c.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isActive: !c.isActive }) });
    if (res.ok) setChannels((list) => list.map((x) => (x.id === c.id ? { ...x, isActive: !c.isActive } : x)));
    setBusy(null);
  };

  const remove = async (c: ChannelRow) => {
    if (!confirm("Remove this alert channel?")) return;
    setBusy(c.id);
    const res = await fetch(`/api/alerts/${c.id}`, { method: "DELETE" });
    if (res.ok) setChannels((list) => list.filter((x) => x.id !== c.id));
    setBusy(null);
  };

  const test = async (c: ChannelRow) => {
    setBusy(c.id);
    setTestMsg((m) => ({ ...m, [c.id]: "Sending…" }));
    const res = await fetch(`/api/alerts/${c.id}`, { method: "POST" });
    const data = await res.json().catch(() => ({}));
    const r = data.result as { ok?: boolean; reason?: string } | undefined;
    setTestMsg((m) => ({ ...m, [c.id]: r?.ok ? "Test alert sent ✓" : `Failed: ${r?.reason ?? "unknown error"}` }));
    setBusy(null);
  };

  return (
    <div className="space-y-8">
      <div>
        <div className="eyebrow text-[#0F372E]">Alerts</div>
        <h1 className="font-display mt-1 text-3xl font-bold text-[#0B1311]">Alert channels</h1>
        <p className="mt-1 text-sm text-slate-600">Every warning and critical event (blacklisting, score drops ≥15, SPF/DKIM/DMARC changes) is dispatched to all active channels.</p>
      </div>

      {(!integrations.email || !integrations.whatsapp) && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 px-4 py-3 text-xs text-emerald-900">
          {!integrations.email && (
            <p>
              <strong>Email</strong> delivery needs <code className="rounded bg-white/80 border border-emerald-200 px-1 py-0.5">RESEND_API_KEY</code> on the server.
            </p>
          )}
          {!integrations.whatsapp && (
            <p className={!integrations.email ? "mt-1" : ""}>
              <strong>WhatsApp</strong> delivery needs <code className="rounded bg-white/80 border border-emerald-200 px-1 py-0.5">TWILIO_ACCOUNT_SID</code>, <code className="rounded bg-white/80 border border-emerald-200 px-1 py-0.5">TWILIO_AUTH_TOKEN</code> and{" "}
              <code className="rounded bg-white/80 border border-emerald-200 px-1 py-0.5">TWILIO_WHATSAPP_NUMBER</code>.
            </p>
          )}
          <p className="mt-1 text-slate-600">Slack and generic webhooks work out of the box. Channels can be saved now and will deliver once keys are configured.</p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_1.3fr]">
        {/* add form */}
        <SpotlightCard borderGlowColor="rgba(16, 185, 129, 0.4)" className="h-fit">
          <form onSubmit={add} className="p-5 sm:p-6">
            <h2 className="font-display text-base font-bold text-[#0B1311]">Add channel</h2>
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {(Object.keys(TYPE_META) as ChannelType[]).map((t) => {
                const M = TYPE_META[t];
                const active = t === type;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => changeType(t)}
                    className={`flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-xs font-semibold transition ${
                      active ? "border-[#0F372E] bg-emerald-50 text-[#0F372E] ring-1 ring-[#0F372E]" : "border-slate-200 bg-slate-50 text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                    }`}
                  >
                    <M.icon className="h-4 w-4" />
                    {M.label}
                  </button>
                );
              })}
            </div>

            <label className="mt-5 block">
              <span className="mb-1.5 block text-xs font-semibold text-slate-700">{meta.label} destination</span>
              <input value={value} onChange={(e) => setValue(e.target.value)} placeholder={meta.placeholder} className="input-domain" required spellCheck={false} autoComplete="off" />
              <span className="mt-1.5 block text-[11px] text-slate-500">{meta.help}</span>
            </label>

            {type === "webhook" && (
              <label className="mt-4 block">
                <span className="mb-1.5 block text-xs font-semibold text-slate-700">Signing secret (optional)</span>
                <input value={secret} onChange={(e) => setSecret(e.target.value)} placeholder="whsec_…" className="input-domain" autoComplete="off" />
                <span className="mt-1.5 block text-[11px] text-slate-500">
                  We send <code>X-DeliverWatch-Signature: sha256=…</code> (HMAC of the raw body).
                </span>
              </label>
            )}

            {error && <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm font-semibold text-rose-700">{error}</p>}

            <button type="submit" disabled={saving || !value.trim()} className="btn-primary mt-5 w-full">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Save channel
            </button>
          </form>
        </SpotlightCard>

        {/* list */}
        <div className="space-y-3">
          {channels.length === 0 ? (
            <SpotlightCard>
              <div className="p-10 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50 text-[#0F372E]">
                  <Bell className="h-6 w-6" />
                </div>
                <h3 className="font-display mt-4 text-lg font-bold text-[#0B1311]">No channels configured</h3>
                <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">Add at least one channel so you hear about blacklistings before your customers do.</p>
              </div>
            </SpotlightCard>
          ) : (
            channels.map((c) => {
              const M = TYPE_META[c.type];
              return (
                <SpotlightCard key={c.id}>
                  <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:p-5">
                    <div className="flex min-w-0 flex-1 items-center gap-4">
                      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${c.isActive ? "border-emerald-200 bg-emerald-50 text-[#0F372E]" : "border-slate-200 bg-slate-50 text-slate-400"}`}>
                        <M.icon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">{M.label}</span>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] ${c.isActive ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-slate-100 text-slate-500 border border-slate-200"}`}>
                            {c.isActive ? "Active" : "Paused"}
                          </span>
                        </div>
                        <div className="truncate text-xs font-medium text-slate-600" title={describe(c)}>
                          {describe(c)}
                        </div>
                        {testMsg[c.id] && <div className="mt-1 text-[11px] font-semibold text-emerald-700">{testMsg[c.id]}</div>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <button type="button" onClick={() => test(c)} disabled={busy === c.id} className="btn-secondary !h-8 !px-3 text-xs">
                        <Send className="h-3.5 w-3.5" /> Test
                      </button>
                      <button
                        type="button"
                        onClick={() => toggle(c)}
                        disabled={busy === c.id}
                        role="switch"
                        aria-checked={c.isActive}
                        className={`relative h-6 w-11 rounded-full border transition ${c.isActive ? "border-[#0F372E] bg-[#0F372E]" : "border-slate-300 bg-slate-200"}`}
                        aria-label="Toggle channel"
                      >
                        <span className={`absolute top-0.5 h-4.5 w-4.5 rounded-full bg-white shadow-sm transition-all ${c.isActive ? "left-[22px]" : "left-0.5"}`} />
                      </button>
                      <button type="button" onClick={() => remove(c)} disabled={busy === c.id} className="rounded-lg p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600" aria-label="Delete channel">
                        {busy === c.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                </SpotlightCard>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
