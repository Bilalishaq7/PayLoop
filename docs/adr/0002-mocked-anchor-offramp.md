# ADR 0002: Mocked anchor for the USDC→Naira off-ramp

## Context

Freelancers need to convert USDC to Naira via a bank payout. A real off-ramp
requires a licensed anchor speaking SEP-24 (and, in production, KYC/AML
handling), which is out of scope for the testnet MVP.

## Decision

`/withdraw` simulates a licensed anchor end-to-end: it previews the payout,
shows processing state, and reports success, but no real bank transfer
occurs and no on-chain funds move. The UI labels it a demo explicitly, and
`docs/ANCHOR.md` describes the production hand-off path.

## Consequences

- The payout story is demoable without anchor credentials, legal review, or
  real money movement.
- Users must not mistake it for a real withdrawal — the "Demo anchor" notice
  is part of the contract with the user, not optional decoration.
- Replacing the mock with a real SEP-24 anchor is a self-contained change
  behind the same route.
