# ADR 0001: Instant release instead of held escrow

## Context

An invoice needs a payout model: either funds move client→freelancer
immediately on payment, or the contract custodies them until a release
trigger (milestone approval, dispute window, etc.).

## Decision

`fund_invoice` transfers USDC directly from client to freelancer in one
atomic Soroban transaction and marks the invoice `Paid`. The contract never
custodies funds. `release_funds` is retained in the ABI as a no-op seam so a
future held-escrow model can be added without breaking the interface.

## Consequences

- One signed transaction per payment; no refund, dispute, or release flow to
  build or audit for the MVP.
- The contract holds no funds, so there is no contract-balance risk.
- Milestone-based or disputeable payments are not possible until the
  `release_funds` seam is implemented; that is an accepted MVP limitation.
