# Naira off-ramp: mock vs. production

PayLoop's `/withdraw` flow lets a freelancer convert USDC to Naira and send it
to a bank account. In this MVP that flow is **mocked**. This document explains
what the mock does and exactly what a production integration would replace.

## What is real vs. what is simulated

| Step in the `/withdraw` flow | Status | Notes |
| --- | --- | --- |
| Read the connected wallet's USDC balance | **Real** | Live Soroban RPC read of the on-chain token balance through `lib/contract.ts` |
| Validate the requested amount against the balance | **Real** | Applied in the UI against that balance |
| Indicative ₦/USDC rate + payout preview | **Real input, indicative output** | The balance is real; the FX rate is a fixed UI constant — no live rate feed |
| Collect bank name + account number | **Real input** | Entered by the user; has **no** validated account behind it |
| Anchor settlement (the delay) | **Simulated** | A client-side timer, not an anchor call |
| Payout reference code | **Simulated** | Random string generated in the browser; not issued by an anchor |
| Naira lands in the user's bank account | **Not implemented** | No funds leave the wallet, no SEP-24 transaction exists |

Nothing in this flow is bank-affecting. It is labeled "mocked" in the product UI
wherever it appears.

The on-chain side (invoice creation, USDC payment, balances) is entirely real —
only the fiat leg is simulated.

## What production would look like (SEP-24)

Real fiat off-ramp on Stellar goes through a **licensed anchor** implementing
the SEP-24 (interactive withdrawal) standard:

1. **Discover the anchor** via its `stellar.toml` (`TRANSFER_SERVER_SEP0024`).
2. **Authenticate** with SEP-10 (challenge transaction signed by the user's
   wallet) to obtain a JWT.
3. **Initiate withdrawal**: `POST /transactions/withdraw/interactive` with the
   asset code and JWT. The anchor returns an interactive URL.
4. **KYC + bank details** are collected by the anchor in that interactive
   flow (not by PayLoop — this is what keeps PayLoop out of scope for money
   transmission).
5. **Send the USDC** to the anchor's distribution account in a Stellar payment,
   using the `memo` the anchor specified.
6. **Poll** `GET /transaction?id=...` until `status: completed`; the anchor
   disburses Naira to the user's bank.

### Candidate anchors for NGN

- Anchors in the Stellar ecosystem that support NGN corridors (e.g. via
  regional partners). The specific anchor is a business/compliance decision.

### Code seams already in place

- `/withdraw` is isolated; swapping the mock `setTimeout` settlement for the
  SEP-24 calls above touches only that page plus a new `lib/anchor.ts`.
- The wallet layer (`lib/wallet.ts`) already signs arbitrary XDR, which covers
  both the SEP-10 challenge and the withdrawal payment.

## Why mock for the MVP

Integrating a live anchor requires a signed agreement, KYC onboarding, and
production credentials — none of which are available for a testnet demo. The
mock demonstrates the full UX and the on-chain balance is real; only the
fiat leg is simulated.
