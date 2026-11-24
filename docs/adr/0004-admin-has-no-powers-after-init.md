# ADR 0004: Admin has no powers after initialization

## Context

The contract has an `admin` set at `initialize`. The question is what that
admin can do afterwards: upgrade the contract, freeze funds, rewrite
invoices, or manage users.

## Decision

After `initialize` (a one-time, admin-gated call), the admin retains exactly
one power: `add_allowed_token`, which can only append to the token
allowlist. There is no upgrade path, no fund freeze, no invoice mutation,
and no user management. `initialize` itself can only run once
(`AlreadyInitialized`).

## Consequences

- The deployed contract's behavior is fixed and auditable; nobody —
  including the deployer — can rug or rewrite invoice history.
- Adding a new accepted token is possible but cannot change existing
  invoices or redirect funds.
- Any future privileged operation (e.g. contract upgrade) would require a
  new, explicitly debated ADR and a new deployment.
