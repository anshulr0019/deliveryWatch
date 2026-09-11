"use client";
import { useId } from "react";
export function ScanOptionsFields({ selectors, sendingIp, onSelectors, onSendingIp }: {
  selectors: string; sendingIp: string; onSelectors: (value: string) => void; onSendingIp: (value: string) => void;
}) {
  const id = useId();
  return <details className="mt-4 w-full text-left text-sm">
    <summary className="cursor-pointer font-semibold text-slate-600">Optional: DKIM selectors & sending IP</summary>
    <div className="mt-3 grid gap-3 sm:grid-cols-2">
      <label htmlFor={`${id}-selectors`} className="text-xs font-medium text-slate-600">DKIM selectors (up to five, comma-separated)
        <input id={`${id}-selectors`} value={selectors} onChange={e => onSelectors(e.target.value)} placeholder="google, selector1" maxLength={600} className="input-domain mt-1 w-full" />
      </label>
      <label htmlFor={`${id}-ip`} className="text-xs font-medium text-slate-600">Outbound sending IPv4 address
        <input id={`${id}-ip`} value={sendingIp} onChange={e => onSendingIp(e.target.value)} placeholder="Your provider's sending IP" maxLength={15} className="input-domain mt-1 w-full" />
      </label>
    </div>
    <p className="mt-2 text-xs text-slate-500">Without these, we probe common selectors and check an inbound MX address. That cannot establish your outbound reputation or prove DKIM signing.</p>
  </details>;
}
