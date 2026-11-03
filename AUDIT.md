# PayLoop maintainer-criteria audit (Phase 1)

Scope: full repository audit against the Drips Stellar Wave rejection criteria —
technical quality, maintainability, Stellar ecosystem relevance, and developer
usability. This file was written **before** any remediation; each item records
weakness → location → why it matters → recommended fix → priority.

Baseline check performed during the audit (unchanged code):

- `cargo fmt --all --check` → pass
- `cargo clippy --all-targets` → clean (no warnings)
- `cargo test` → 7/7 pass
- Toolchain: Rust 1.96.1, `wasm32v1-none` target installed, Node 25

Facts verified during the audit (evidence-backed, no fabrication):

- Survey CSV (`docs/survey-responses.csv`): **60 rows**, valid unique Stellar
  addresses for all 60 wallets, average rating **5.23**, recommend split
  **52 Yes / 8 Maybe / 0 No**, Level-4 subset (first 10 rows) average **5.30**.
  The README/FEEDBACK figures ("60 responses, avg 5.2/6, 52 Yes / 8 Maybe")
  match the committed data.
- **No `.env*` or secret files were ever committed** (`git log --all
  --name-only` checked); `web/.env.local` and `.vercel/.env.production.local`
  are untracked and gitignored.
- 68 commits on `main`; the "45+ commits before Level 5" claim in
  SUBMISSION.md is consistent with the commit history.
- The README screenshot table duplicates content that also exists in
  `docs/screenshots/README.md` (see item F-1).

---

## A. Soroban contract quality (`contracts/invoice/src/lib.rs`)

### A-1. `fund_invoice` has no pre-flight balance check — clients get an opaque host panic
- **Where:** `contracts/invoice/src/lib.rs`, `fund_invoice`
- **Why it matters:** If the client's token balance is below `invoice.amount`,
  the embedded `token.transfer` traps with a token-contract error. The client
  sees an opaque host error instead of a typed contract error, and the web app
  cannot distinguish "insufficient funds" from anything else. Integrators
  cloning the contract inherit the same opaque failure.
- **Recommendation:** Read the client's balance via the token client and return
  a typed `Error::InsufficientBalance` before transferring. Keep the transfer as
  the authoritative check (pre-check is advisory, not a race guarantee).
- **Priority:** high

### A-2. No authorization tests — `require_auth` enforcement is unverified
- **Where:** `contracts/invoice/src/test.rs` (all tests use `mock_all_auths()`)
- **Why it matters:** The only access-control mechanism in the contract is
  `freelancer.require_auth()` on create and `invoice.client.require_auth()` on
  fund. `mock_all_auths()` makes every call pass regardless of which party
  "signed", so nothing in the test suite proves an impostor cannot create an
  invoice in someone else's name or cannot fund an invoice with someone else's
  authorization. For an escrow-adjacent contract this is the single most
  important missing test class.
- **Recommendation:** Add `MockAuth`-based tests that (a) verify create-level
  auth is required from the freelancer, (b) verify fund-level auth is required
  from the client, and (c) verify a call *without* the expected party's auth
  fails.
- **Priority:** critical

### A-3. `create_invoice` accepts empty descriptions and freelancer == client
- **Where:** `contracts/invoice/src/lib.rs`, `create_invoice`
- **Why it matters:** An empty description makes the invoice record useless for
  the "portable income history" pitch, and a self-directed invoice (freelancer
  == client) is a way to pad on-chain activity statistics with meaningless
  records — directly relevant to how the Drips submission is judged for
  authenticity.
- **Recommendation:** Reject empty descriptions (`Error::InvalidDescription`)
  and self-directed invoices (`Error::InvalidParties`). Append new error codes
  after the existing ones so the wire encoding of existing errors is unchanged.
- **Priority:** high

### A-4. `release_funds` no-op is easy to misread as a live escrow primitive
- **Where:** `contracts/invoice/src/lib.rs`, `release_funds`
- **Why it matters:** The function exists only as a future-milestone seam, but
  it takes anyone's call and always returns `Ok(())` (after checking the
  invoice exists). An integrator reading the ABI cannot tell that it is inert.
- **Recommendation:** Tighten the doc comment to state explicitly that it
  performs **no state change and no funds movement** in this design, and mark
  the invoice-is-not-found branch loudly. No behavior change.
- **Priority:** medium

### A-5. `get_invoice_history` grows unboundedly and re-reads every invoice
- **Where:** `contracts/invoice/src/lib.rs`, `get_invoice_history` + `History(Address)` key
- **Why it matters:** Every create appends to one persistent `Vec<u64>` and the
  read re-loads **every** invoice struct per freelancer per call. For a
  freelancer with hundreds of invoices this hits Soroban read-footprint limits
  and breaks the dashboard read. There is no pagination anywhere in the ABI.
- **Recommendation:** Document the current limitation and the intended direction
  (windowed reads / paginated accessor) in the contract README; do not change
  the ABI in this pass.
- **Priority:** medium

### A-6. `admin` is stored but has no functions; token is immutable post-init
- **Where:** `lib.rs`, `DataKey::Admin` / `initialize`
- **Why it matters:** `admin` is written at `initialize` and never read again.
  There is no rotation, no admin-triggered recovery, and the default token can
  never be changed. This is a defensible simplicity decision for an MVP but is
  undocumented, so reviewers can't distinguish "simple by design" from
  "forgotten".
- **Recommendation:** Document the decision (single-transaction init, fixed
  token, no admin powers beyond initialization) in the contract README.
- **Priority:** low

### A-7. Missing test coverage for meaningful edge cases
- **Where:** `contracts/invoice/src/test.rs`
- **Why it matters:** Beyond auth (A-2), the suite does not cover: insufficient
  client balance, invalid/empty description, self-directed invoices, empty
  history for an unknown freelancer, and sequential id allocation across
  multiple create calls.
- **Recommendation:** Add the tests listed; keep the existing 7 untouched.
- **Priority:** high

## B. Stellar integration limitations (`web/`)

### B-1. `getAllInvoices` scans ids 1..250 with one RPC simulation each
- **Where:** `web/lib/contract.ts`, `getAllInvoices`
- **Why it matters:** Every Activity page load performs up to 250 sequential
  `  simulateTransaction` calls to the public testnet RPC. The `max` bound keeps
  it functional, but it is slow and rate-limit-prone; contract events would
  be the correct primitive.
- **Recommendation:** Leave behavior as-is (it works and backs the usage proof)
  but document the scan approach, its bound, and the migration path (consume
  the `InvoiceCreated`/`InvoicePaid` contract events) in ARCHITECTURE.md.
- **Priority:** medium

### B-2. Faucet route is an unauthenticated unlimited mint endpoint
- **Where:** `web/app/api/faucet/route.ts`
- **Why it matters:** Any caller can mint 500 test USDC repeatedly. Acceptable
  on testnet, but nothing in the docs says the route must be removed or gated
  (rate limit / auth) before any mainnet-style deployment.
- **Recommendation:** Document the limitation explicitly (testnet-only,
  remove/gate before public deployment) in ARCHITECTURE.md security notes.
  No code change needed for the testnet product.
- **Priority:** medium

### B-3. Read source is a hardcoded third-party account
- **Where:** `web/lib/contract.ts`, `READ_SOURCE`
- **Why it matters:** Simulations are built over someone else's account
  address. It never signs anything, so it is not a security issue, but it is
  unexplained and brittle-looking.
- **Recommendation:** Document that the address is only a simulation source
  and never a signer.
- **Priority:** low

## C. Data integrity / truthfulness issues

### C-1. UI silently rewrites on-chain descriptions into invented work names
- **Where:** `web/lib/format.ts`, `humanizeDescription` (DESCRIPTION_LABELS)
- **Why it matters:** Raw on-chain demo descriptions such as
  "test invoice from bot" are displayed to users as "Mobile app development" /
  "Website design". This misrepresents immutable on-chain data in a submission
  whose credibility rests on verifiable on-chain activity — exactly the kind of
  thing an ecosystem reviewer checking testnet-traction.csv against the live
  Activity page would notice.
- **Recommendation:** Remove the mapping and display the real on-chain
  description everywhere.
- **Priority:** high

### C-2. `USERS.md` wallet addresses are truncated, weakening its own proof purpose
- **Where:** `docs/USERS.md`
- **Why it matters:** The proof log shows `GB46MTG7…S6DV2BST` — not
  independently verifiable per-user. Full addresses are committed in
  `docs/survey-responses.csv`, but the doc doesn't say so directly.
- **Recommendation:** Point explicitly at the CSV (committed, with full
  addresses) as the primary evidence source and keep the table as a readable
  index. Do not re-fabricate anything.
- **Priority:** medium

## D. Developer documentation gaps

### D-1. No contract-level developer documentation (reusability gap)
- **Where:** `contracts/invoice/` (no README); `contracts/DEPLOYMENT.md` covers only deployment
- **Why it matters:** The entrypoints, arguments, auth requirements, error
  codes, events, and storage layout are only documented in
  `docs/ARCHITECTURE.md` at summary level. Another Stellar developer cannot
  easily take this contract and reuse it, which is one of the Drips criteria.
- **Recommendation:** Add `contracts/invoice/README.md`: lifecycle, storage
  model, entrypoint table (args/auth/errors/events), error code table,
  build/test/deploy quickstart, and a TypeScript/CLI integration example using
  the existing testnet deployment.
- **Priority:** high

### D-2. No CONTRIBUTING.md, SECURITY.md, or LICENSE file
- **Where:** repository root
- **Why it matters:** README claims "MIT" and Cargo declares `license = "MIT"`
  but there is **no LICENSE file**, so the legal claim is unanchored. There is
  also no documented way to report bugs or submit PRs — a direct hit on the
  "maintainer activity" criterion.
- **Recommendation:** Add `LICENSE` (MIT, "The PayLoop authors"),
  `CONTRIBUTING.md` (bug reports, PR process, conventional commits, test
  requirements), and optionally a lightweight `SECURITY.md`.
- **Priority:** high (LICENSE), high (CONTRIBUTING), medium (SECURITY.md)

## E. Off-ramp transparency

### E-1. ANCHOR.md is good but does not separate "real" from "simulated" sharply enough
- **Where:** `docs/ANCHOR.md`
- **Why it matters:** The doc already says the fiat leg is mocked, which is
  honest. It can mislead a fast reviewer because it doesn't put the
  real-vs-simulated split into one scannable table, and it doesn't state the
  concrete limitations of the mock (no KYC, no bank leg, no SEP-10, reference
  code is client-generated state).
- **Recommendation:** Add a "Real vs simulated" table and an explicit
  limitations list; keep all existing content.
- **Priority:** medium

## F. README claims and consistency

### F-1. Screenshot table duplicates `docs/screenshots/README.md`
- **Where:** README "Screenshots & demo" section
- **Why it matters:** Two canonical lists of the same assets drift apart (the
  desktop table omits files present in the screenshots README: `preview.png`,
  `history.png`, `tour.png`, `theme-light.png` and lists `create-success.png`
  differently).
- **Recommendation:** Keep a single canonical table in README (the most-linked
  proof assets) and link `docs/screenshots/README.md` as the full index instead
  of maintaining two lists.
- **Priority:** low

### F-2. Vague time reference ("as of this writing")
- **Where:** README, "On-chain activity snapshot" bullet
- **Why it matters:** "43 invoices, 35 Paid as of this writing" is unverifiable
  wording.
- **Recommendation:** Replace with an explicit as-of date matching the last
  verified snapshot wording.
- **Priority:** low

### F-3. Unsupported/generic claims the audit could NOT verify
- **Where:** README/SUBMISSION/FEEDBACK
- **Verified as supported:** 60 survey responses; avg 5.2; 52/8/0 recommend
  split; 42-invoice committed snapshot; contract/token addresses; CI badges &
  workflow files; demo video link; survey form link; Excel export script.
- **Not fully verifiable from the repo:** live Activity page live counts (needs
  the deployed app), Vercel Analytics/Sentry dashboards, the Loom video content
  itself. SUBMISSION.md already marks these as human tasks rather than
  claiming them in-repo — acceptable, no change.
- **Priority:** low (documentation note only)

## G. Evidence of genuine Stellar ecosystem work already present (strengths)

These are real, code-level Stellar/Soroban engineering points that should be
made more visible in the README's ecosystem section, since the Drips criteria
value relevance:

- Soroban SDK 27 contract with typed `contracterror`, `contractevent` topics,
  instance vs persistent storage split, and an SAC-backed payment token.
- A pinned, explained dependency workaround
  (`contracts/invoice/Cargo.toml`: ed25519-dalek 2.2.0 pinned against a real
  soroban-env-host testutils break) — the kind of detail a maintainer values.
- Contract CI building the actual `wasm32v1-none` release artifact.
- In-app trustline management (`changeTrust` via Horizon) because Freighter's
  asset UI is unreliable — a practical UX hardening for testnet SAC tokens.
- Read-only RPC simulation discipline in `web/lib/contract.ts` (reads never
  submitted, writes prepared → signed → polled).

## H. Root-level hygiene

### H-1. Stray untracked screenshot at repository root
- **Where:** `....png` (1920x1030 PNG, untracked)
- **Why it matters:** Appears to be an accidentally created screenshot; it is
  not referenced by anything.
- **Recommendation:** Delete it (user-file caution: kept in place during this
  audit; removal flagged for the user's approval).
- **Priority:** low

---

## Priority summary

| Priority | Items |
| --- | --- |
| critical | A-2 (authorization tests) |
| high | A-1, A-3, A-7, C-1, D-1, D-2 |
| medium | A-4, A-5, B-1, B-2, C-2, E-1 |
| low | A-6, B-3, F-1, F-2, H-1 |

Deliberately **out of scope** for Phase 2 (recorded so reviewers know they were
seen and consciously skipped): frontend rebuild/redesign, pagination or event
indexing changes to the contract_ABI, adding new features, rate-limiting the
faucet for testnet, and any change to the deployed testnet contract instance.
