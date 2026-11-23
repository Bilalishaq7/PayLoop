import { config } from "./config.ts";
import { formatAmount, humanizeDescription } from "./format.ts";
import type { Invoice } from "./contract";

export type ReminderInvoice = Pick<Invoice, "id" | "amount" | "description">;
export type ReminderToken = { symbol: string; decimals: number };

function paymentUrl(invoiceId: string, origin?: string): string {
  const base = origin ?? (typeof window !== "undefined" ? window.location.origin : "");
  return base ? `${base}/pay/${invoiceId}` : `/pay/${invoiceId}`;
}

export function buildReminder(
  invoice: ReminderInvoice,
  origin?: string,
  token: ReminderToken = { symbol: config.tokenSymbol, decimals: config.tokenDecimals }
): string {
  const description = humanizeDescription(invoice.description) || "no description";
  return `Hi! You have an outstanding PayLoop invoice #${invoice.id} for ${formatAmount(
    invoice.amount,
    token.decimals
  )} ${token.symbol} (${description}). Please pay it here: ${paymentUrl(invoice.id, origin)}`;
}

export function buildWhatsAppUrl(message: string): string {
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}

export function buildEmailUrl(invoice: ReminderInvoice, message: string): string {
  const subject = `Payment reminder: PayLoop invoice #${invoice.id}`;
  return `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;
}

export async function shareReminder(message: string, title: string): Promise<boolean> {
  if (typeof navigator === "undefined" || typeof navigator.share !== "function") {
    return false;
  }
  try {
    await navigator.share({ title, text: message });
    return true;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return true;
    }
    return false;
  }
}
