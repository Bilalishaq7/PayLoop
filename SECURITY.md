# Security policy

## Supported

Stellar **testnet** deployment of the PayLoop contract and web app (the
addresses in the root README), plus the `main` branch of this repository.

The web app is deployed against testnet only. Any mainnet-style deployment
would require at minimum removing or gating the unauthenticated faucet route
(`web/app/api/faucet/route.ts`) and re-auditing the off-ramp flow (currently
mocked, see `docs/ANCHOR.md`).

## Reporting a vulnerability

Please use GitHub's **private security advisory** for this repository rather
than a public issue, so there is no disclosure window. Include:

- affected component (contract entrypoint / web route / doc claim),
- reproduction steps or a transaction id,
- your assessment of impact.

You will get an acknowledgement; fixes land as regular PRs (labelled
`security`) until disclosure is coordinated.

## Notes for reviewers of this contract

- The contract is deliberately minimal: single initializer, no admin functions
  after `initialize`, fixed payment token, two-state invoice lifecycle.
  Security-relevant properties (who can create, who must authorize funding,
  double-payment rejection, balance pre-check) are defined in
  [contracts/invoice/README.md](contracts/invoice/README.md#entrypoints) and
  enforced in `contracts/invoice/src/lib.rs`.
- Testnet-only shared-state caveat anyone can verify on-chain: the faucet
  mints freely (test asset). This does not imply mainnet equivalence. Funding
  is not open to anyone: only the client named on an invoice can fund it.
