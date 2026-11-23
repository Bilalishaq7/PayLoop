# Assigned issues #16 and #22: delivery notes

## #16 getAllInvoices partial results and sequential scan

Delivered: the scan now runs in ordered batches of ten ids instead of one awaited RPC call at a time. A thrown RPC error is returned as an `error` on the result together with the invoices loaded before it, so History and Activity show a retry banner instead of a silently truncated list. Reaching the 250 id cap sets `reachedCap` and shows an explicit "showing the first N invoices" notice. A one-entry, 30 second single-flight cache is shared by both pages, and the Retry and Refresh buttons clear it. Scan orchestration is a pure module with unit tests for the id 40 failure, ordering, cap and cache behaviour.

Follow-up: the ledger scan still stops at 250 because the contract has no counter or pagination accessors. Those belong to the separate contract issues #30 and #32, and this change is intentionally frontend-only. The cache is per browser tab, not a shared server cache. It shortens repeat scans but does not make RPC downtime transparent; users still get a visible error and an explicit retry.

## #22 Rich link previews

Delivered: a static default Open Graph card, a server wrapper for `/pay/[id]` with `generateMetadata`, and a pure title builder. A valid invoice produces "Invoice #1 - X USDC - Pending" style titles and description. A missing id or an RPC failure falls back to a generic PayLoop card rather than throwing. The existing client payment UI is unchanged apart from receiving `id` as a prop, and `metadataBase` is configured from deployment environment variables.

Follow-up: the default image is text-only. The logo replacement tracked in issue #1 and PR #135 is separate work, so this PR does not touch logo assets. Per-invoice dynamic images are optional in the issue and are not implemented; the share title and description use only data already on chain. When RPC is unavailable at crawl time, social previews use the generic fallback title.

## Overlap with other open PRs

PR #44 also edits `web/app/activity/page.tsx` and `web/app/history/page.tsx` for CSV export, and PR #135 changes branding. Maintainers should expect ordinary merge conflicts in those files; no attempt was made to amend or close those PRs.
