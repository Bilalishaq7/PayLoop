import { track } from "@vercel/analytics";

// Privacy-safe product funnel events. Call `trackEvent` once per successful
// action. Never include wallet addresses, amounts, descriptions, invoice ids
// or any other on-chain identifying data — only the event name is sent.
//
// Events:
//   invoice_created    — an invoice was successfully created on-chain
//   invoice_paid       — a client successfully funded an invoice
//   faucet_requested   — test USDC was successfully dispensed by the faucet
//   trustline_enabled  — a wallet successfully enabled the token trustline
export type AnalyticsEvent =
  "invoice_created" | "invoice_paid" | "faucet_requested" | "trustline_enabled";

export function trackEvent(event: AnalyticsEvent) {
  track(event);
}
