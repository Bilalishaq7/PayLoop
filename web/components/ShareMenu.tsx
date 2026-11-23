"use client";

import { useEffect, useRef, useState } from "react";
import type { Invoice } from "@/lib/contract";
import { buildEmailUrl, buildReminder, buildWhatsAppUrl, shareReminder } from "@/lib/reminders";
import { useTokenMeta } from "@/lib/use-token-meta";

type Props = {
  invoice: Pick<Invoice, "id" | "amount" | "description" | "token">;
  className?: string;
  buttonClassName?: string;
  align?: "left" | "right";
  label?: string;
};

export function ShareMenu({
  invoice,
  className = "",
  buttonClassName = "btn-ghost text-xs",
  align = "right",
  label = "Remind",
}: Props) {
  const [open, setOpen] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [fallback, setFallback] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const token = useTokenMeta(invoice.token);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  function showFeedback(message: string) {
    setFeedback(message);
    setTimeout(() => setFeedback(null), 2000);
  }

  async function copyMessage() {
    const message = buildReminder(invoice, undefined, token);
    try {
      await navigator.clipboard.writeText(message);
      showFeedback("Copied ✓");
      setFallback(null);
      setOpen(false);
    } catch {
      setFallback(message);
      setFeedback("Copy failed");
    }
  }

  async function nativeShare() {
    const message = buildReminder(invoice, undefined, token);
    const shared = await shareReminder(message, `PayLoop invoice #${invoice.id}`);
    if (shared) {
      showFeedback("Shared ✓");
      setOpen(false);
    } else {
      setFeedback("Share unavailable");
    }
  }

  const message = buildReminder(invoice, undefined, token);
  const hasNativeShare = typeof navigator !== "undefined" && typeof navigator.share === "function";

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={buttonClassName}
        title="Share a payment reminder"
        aria-expanded={open}
      >
        {feedback ?? label}
      </button>

      {open && (
        <div
          className={`absolute z-20 mt-2 w-52 rounded-xl border border-white/10 bg-slate-900/95 p-2 shadow-xl backdrop-blur ${
            align === "right" ? "right-0" : "left-0"
          }`}
        >
          <button type="button" onClick={copyMessage} className="btn-ghost w-full justify-start text-xs">
            Copy reminder
          </button>
          <a
            href={buildWhatsAppUrl(message)}
            target="_blank"
            rel="noreferrer"
            className="btn-ghost block w-full text-left text-xs"
            onClick={() => setOpen(false)}
          >
            WhatsApp
          </a>
          <a
            href={buildEmailUrl(invoice, message)}
            className="btn-ghost block w-full text-left text-xs"
            onClick={() => setOpen(false)}
          >
            Email
          </a>
          {hasNativeShare && (
            <button type="button" onClick={nativeShare} className="btn-ghost w-full justify-start text-xs">
              Share...
            </button>
          )}
        </div>
      )}

      {fallback && (
        <div className="absolute right-0 z-20 mt-2 w-72 rounded-xl border border-amber-400/30 bg-slate-950/95 p-3 text-xs shadow-xl">
          <p className="mb-2 text-amber-200">Clipboard access failed. Copy the reminder manually:</p>
          <textarea
            readOnly
            value={fallback}
            className="input min-h-24 w-full text-xs"
            onFocus={(e) => e.currentTarget.select()}
          />
          <div className="mt-2 flex justify-end gap-2">
            <button type="button" onClick={() => setFallback(null)} className="btn-ghost text-xs">
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
