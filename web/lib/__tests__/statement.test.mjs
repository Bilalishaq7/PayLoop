import test from "node:test";
import assert from "node:assert/strict";
import { buildStatement, parseRange, statementTitle } from "../statement.ts";

const ME = "GME";
const OTHER = "GOTHER";
const USDC = "CUSDC";
const EURC = "CEURC";

// Unix seconds for a local date and time, matching how the range is built.
const at = (y, m, d, h = 12) => BigInt(Math.floor(new Date(y, m - 1, d, h).getTime() / 1000));

const invoice = (id, over = {}) => ({
  id: String(id),
  freelancer: ME,
  client: OTHER,
  token: USDC,
  amount: 100n,
  description: `Job ${id}`,
  status: "Paid",
  paidAt: at(2026, 3, 10),
  ...over,
});

const range = (from, to) => {
  const result = parseRange(from, to);
  assert.equal(result.ok, true);
  return result.range;
};

// ── range ───────────────────────────────────────────────────────────────────

test("parseRange covers both whole days", () => {
  const r = range("2026-03-01", "2026-03-31");
  assert.equal(r.startSec, at(2026, 3, 1, 0));
  assert.equal(r.endSec, at(2026, 4, 1, 0));
});

test("parseRange accepts a single day", () => {
  const r = range("2026-03-10", "2026-03-10");
  assert.equal(r.endSec - r.startSec > 0n, true);
});

test("parseRange rejects empty, malformed and impossible dates", () => {
  assert.equal(parseRange("", "2026-03-01").ok, false);
  assert.equal(parseRange("2026-03-01", "").ok, false);
  assert.equal(parseRange("03/01/2026", "2026-03-01").ok, false);
  assert.equal(parseRange("2026-02-31", "2026-03-01").ok, false);
});

test("parseRange rejects a start after the end", () => {
  const result = parseRange("2026-04-01", "2026-03-01");
  assert.equal(result.ok, false);
  assert.match(result.error, /on or before/);
});

// ── statement ───────────────────────────────────────────────────────────────

test("includes only paid invoices where the wallet is the freelancer", () => {
  const invoices = [
    invoice(1),
    invoice(2, { status: "Pending", paidAt: 0n }),
    invoice(3, { freelancer: OTHER, client: ME }),
  ];
  const s = buildStatement(invoices, ME, range("2026-03-01", "2026-03-31"));
  assert.deepEqual(s.rows.map((r) => r.id), ["1"]);
});

test("range edges are inclusive of both days and exclusive of the next", () => {
  const invoices = [
    invoice(1, { paidAt: at(2026, 2, 28, 23) }),
    invoice(2, { paidAt: at(2026, 3, 1, 0) }),
    invoice(3, { paidAt: at(2026, 3, 31, 23) }),
    invoice(4, { paidAt: at(2026, 4, 1, 0) }),
  ];
  const s = buildStatement(invoices, ME, range("2026-03-01", "2026-03-31"));
  assert.deepEqual(s.rows.map((r) => r.id), ["2", "3"]);
});

test("rows are oldest first, ties broken by invoice id", () => {
  const invoices = [
    invoice(5, { paidAt: at(2026, 3, 20) }),
    invoice(3, { paidAt: at(2026, 3, 10) }),
    invoice(2, { paidAt: at(2026, 3, 10) }),
  ];
  const s = buildStatement(invoices, ME, range("2026-03-01", "2026-03-31"));
  assert.deepEqual(s.rows.map((r) => r.id), ["2", "3", "5"]);
});

test("totals add up per token and equal the sum of the rows", () => {
  const invoices = [
    invoice(1, { amount: 100n }),
    invoice(2, { amount: 250n }),
    invoice(3, { amount: 40n, token: EURC }),
  ];
  const s = buildStatement(invoices, ME, range("2026-03-01", "2026-03-31"));
  assert.deepEqual(s.totals, [
    { token: USDC, amount: 350n },
    { token: EURC, amount: 40n },
  ]);
  const rowSum = s.rows.reduce((sum, r) => sum + r.amount, 0n);
  assert.equal(s.totals.reduce((sum, t) => sum + t.amount, 0n), rowSum);
});

test("an empty range gives no rows and no totals", () => {
  const s = buildStatement([invoice(1)], ME, range("2025-01-01", "2025-12-31"));
  assert.deepEqual(s.rows, []);
  assert.deepEqual(s.totals, []);
  assert.equal(s.undated, 0);
});

test("no invoices at all is handled", () => {
  const s = buildStatement([], ME, range("2026-03-01", "2026-03-31"));
  assert.deepEqual(s, { rows: [], totals: [], undated: 0 });
});

test("paid invoices without a paid date are counted, not silently dropped", () => {
  const s = buildStatement([invoice(1, { paidAt: 0n })], ME, range("2026-03-01", "2026-03-31"));
  assert.deepEqual(s.rows, []);
  assert.equal(s.undated, 1);
});

test("does not change the input list", () => {
  const invoices = [invoice(2, { paidAt: at(2026, 3, 20) }), invoice(1, { paidAt: at(2026, 3, 10) })];
  buildStatement(invoices, ME, range("2026-03-01", "2026-03-31"));
  assert.deepEqual(invoices.map((i) => i.id), ["2", "1"]);
});

// ── title ───────────────────────────────────────────────────────────────────

test("statementTitle is a filename-safe title", () => {
  assert.equal(statementTitle("2026-01-01", "2026-03-31"), "PayLoop-Income-Statement-2026-01-01-to-2026-03-31");
  assert.equal(statementTitle("../x", "2026/03"), "PayLoop-Income-Statement--to-202603");
});
