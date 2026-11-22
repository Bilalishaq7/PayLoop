import test from "node:test";
import assert from "node:assert/strict";
import { buildInvoiceMetadata } from "../invoice-metadata.ts";

test("builds the exact share title for an invoice", () => {
  const metadata = buildInvoiceMetadata("1", {
    id: "1",
    amountLabel: "10 USDC",
    status: "Pending",
  });

  assert.equal(metadata.title, "Invoice #1 - 10 USDC - Pending");
  assert.equal(
    metadata.openGraph.title,
    "Invoice #1 - 10 USDC - Pending"
  );
  assert.match(metadata.description, /Invoice #1 for 10 USDC is pending/);
});

test("a missing invoice falls back gracefully", () => {
  const metadata = buildInvoiceMetadata("999", null);
  assert.equal(metadata.title, "Invoice #999 on PayLoop");
  assert.match(metadata.description, /View and pay a PayLoop invoice/);
});

test("a malformed id never leaks into the title", () => {
  const metadata = buildInvoiceMetadata("<script>", null);
  assert.equal(metadata.title, "Invoice #unknown on PayLoop");
});

test("paid invoices keep their status in the title", () => {
  const metadata = buildInvoiceMetadata("2", {
    id: "2",
    amountLabel: "4.5 USDC",
    status: "Paid",
  });
  assert.equal(metadata.title, "Invoice #2 - 4.5 USDC - Paid");
});
