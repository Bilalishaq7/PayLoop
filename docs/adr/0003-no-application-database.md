# ADR 0003: No application database

## Context

A typical web app would store invoices, users, and history in Postgres or
similar. PayLoop instead stores all invoice state in the Soroban contract.

## Decision

There is no application database. The contract is the single source of truth
for invoices; the web app is a stateless reader/writer that simulates reads
and submits signed transactions. The only server-side state is the faucet
issuer key and optional feedback webhook config in environment variables.

## Consequences

- No migrations, no DB hosting cost, no sync bugs between app and chain;
  income history is portable and tamper-proof by construction.
- Reads are limited by what the contract exposes (hence the bounded id-scan
  on `/activity`, documented in `docs/ARCHITECTURE.md`).
- Anything that needs server-side persistence (e.g. feedback, rate-limit
  counters beyond per-instance memory) must use external services such as
  Upstash Redis/Vercel KV.
