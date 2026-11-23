# PayLoop Testing Guide

This document describes the testing approach and best practices for the PayLoop dApp.

## Overview

PayLoop has two main components that benefit from different testing strategies:

1. **Smart Contract (`contracts/invoice/`)** — Rust/Soroban, unit-tested with MockAuth patterns
2. **Web App (`web/`)** — Next.js/TypeScript, ESLint linting and type checking

## Smart Contract Testing

### Test Organization

The contract test suite in `contracts/invoice/src/test.rs` contains **26 tests** organized into three categories:

#### Core Functionality (Using `mock_all_auths`)
- Fast tests that verify business logic with all authorizations mocked
- Examples: `create_then_fund_pays_freelancer`, `double_funding_is_rejected`, `funding_short_balance_errors`
- These are the first tests to write for a new feature

#### Authorization Tests (Using `MockAuth` without `mock_all_auths`)
- Explicitly verify that exactly the correct parties signed each operation
- Use `MockAuth` and `MockAuthInvoke` to construct precise auth chains
- Include `sub_invokes` for nested token transfers to show the full authorization flow
- Examples: `create_invoice_succeeds_with_freelancer_auth`, `fund_invoice_succeeds_with_client_auth`

#### Edge Cases and Pagination
- Boundary conditions: empty descriptions, self-directed invoices, insufficient balance
- Pagination and counting: invoice IDs increment, range queries respect bounds
- Unknown addresses: return empty lists (no errors)

### Running Contract Tests

```bash
cd contracts/invoice
cargo test
```

Output: **18 unit tests** (the test file contains 26 tests; some are grouped under test functions that run multiple assertions).

### Authorization Pattern (Best Practice)

The contract demonstrates a reusable Soroban authorization pattern:

```rust
// Step 1: Set up with explicit MockAuth (not mock_all_auths)
env.mock_auths(&[MockAuth {
    address: &signer,
    invoke: &MockAuthInvoke {
        contract: &contract_id,
        fn_name: "fund_invoice",
        args: /* the exact args */,
        sub_invokes: &[
            // Nested authorize for token.transfer inside fund_invoice
            MockAuthInvoke {
                contract: &token,
                fn_name: "transfer",
                args: /* exact transfer args */,
                sub_invokes: &[],
            }
        ],
    },
}]);

// Step 2: Call the contract (authorization will be verified against the MockAuth above)
contract.fund_invoice(&id);
```

This pattern proves:
- The signer is exactly the right address (not an impostor)
- The function name matches what was actually called
- The arguments match exactly
- Nested token transfers are authorized by the same party

**Why this matters:** Soroban `require_auth` calls are runtime guards; if you forget to call `require_auth(signer)`, the test with `mock_all_auths` will pass but the authorization is not actually checked. The `MockAuth` pattern forces you to prove it.

### Adding a New Contract Test

1. **For business logic:** Use `mock_all_auths()`, write the happy path, then add error cases
2. **For authorization:** Use `MockAuth`, construct the exact invoke chain, then verify error paths (no auth, wrong address)
3. **For edge cases:** Use `mock_all_auths()`, test boundaries and invalid inputs
4. **Always verify state:** After each operation, assert that contract state changed (or didn't) as expected

Example template:

```rust
#[test]
fn my_new_feature_works() {
    let s = setup();  // or auth_setup() for authorization tests
    let freelancer = Address::generate(&s.env);
    
    // Execute the operation
    let result = s.contract.my_new_function(&freelancer);
    
    // Verify state changed correctly
    assert_eq!(result, expected_value);
    let stored = s.contract.get_state(&freelancer);
    assert_eq!(stored.some_field, expected_value);
}
```

## Web App Testing

### Current Approach

The web app uses:
- **TypeScript strict mode** (`tsconfig.json`) — catches type errors at build time
- **ESLint** (`npm run lint` in `web/`) — enforces code style and common bugs
- **Next.js build** (`npm run build`) — catches route and config issues

No unit test framework is currently configured, but the app can be manually tested:

```bash
cd web
npm install
npm run dev
# Open http://localhost:3000 and manually test features
```

### Manual Testing Checklist

1. **Wallet connection** — Freighter connects and displays account balance
2. **Create invoice** — Form validates, preview shows correct data, submission succeeds
3. **Fund invoice** — Payment link works, funds transferred atomically, receipt displays
4. **History page** — Invoices list in correct order, filters work, search works
5. **Activity page** — Live stats update, CSV export downloads
6. **Offline handling** — Errors display clearly, retry works
7. **Mobile layout** — Responsive on mobile browsers
8. **Dark/light mode** — Toggle works, preference persists

### Adding Type Safety

The app uses TypeScript `strict` mode. When adding features:

```typescript
// ✅ Good: explicit types
function createInvoice(freelancer: Address, amount: i128): Promise<InvoiceResult> {
  // ...
}

// ❌ Bad: implicit any
function createInvoice(freelancer, amount) {
  // ...
}
```

### Adding Lint Rules

If you add a new utility or component:

```bash
cd web
npm run lint
```

Fix any warnings before committing. Violations are also caught in the GitHub Actions CI on every PR.

## CI/CD Pipeline

Both components are tested in GitHub Actions on every push and pull request:

| Workflow | Tests | Required to pass PR |
| --- | --- | --- |
| `contract.yml` | `cargo test` | Yes |
| `web.yml` | `npm run lint`, `npm run build` | Yes |

Failing tests or lint errors block PR merge until fixed.

## Writing Testable Code

### Contracts

✅ **Testable pattern:**
- Separate concerns: storage, authorization, business logic
- Use `require_auth` explicitly for every write operation
- Return typed `Result<T, Error>` from fallible operations
- Emit events for indexers (InvoiceCreated, InvoicePaid)

❌ **Hard to test:**
- Global state mutations without clear guards
- Implicit authorization (relying on a wrapper to call `require_auth`)
- Panics instead of error returns
- Silent failures or missing events

### Web App

✅ **Testable pattern:**
- Pure functions for formatting and validation
- Extract contract calls into `lib/contract.ts` (testable via TypeScript type checking)
- Use error boundaries for failure states
- Log errors to Sentry for monitoring

❌ **Hard to test:**
- Complex component logic mixed with render
- Network calls deep in component trees
- Hardcoded addresses or secrets (use env vars)

## Debugging Test Failures

### Contract

```bash
# Run one test with output
cargo test test_name -- --nocapture

# See what auth was expected vs. what was provided
# (error will include the MockAuth mismatch)
```

### Web App

```bash
# Type errors
npm run build

# Lint warnings
npm run lint

# Manual test: open DevTools and check console for errors
```

## Resources

- [Soroban testing docs](https://developers.stellar.org/docs/learn/testing)
- [Rust testing](https://doc.rust-lang.org/book/ch11-00-testing.html)
- [Next.js deployment](https://nextjs.org/docs/deployment)
- [TypeScript strict mode](https://www.typescriptlang.org/tsconfig#strict)

## Questions?

See [CONTRIBUTING.md](../CONTRIBUTING.md) for how to report test bugs or suggest improvements.
