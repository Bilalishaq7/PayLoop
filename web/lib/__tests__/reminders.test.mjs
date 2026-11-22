import test from "node:test";
import assert from "node:assert/strict";
import { buildReminder, buildWhatsAppUrl, buildEmailUrl } from "../reminders.ts";

const invoice = {
  id: "42",
  amount: 10_000_000n,
  description: "Website redesign",
};

test("buildReminder formats a single source-of-truth message", () => {
  const message = buildReminder(invoice, "https://payloop.example");
  assert.equal(
    message,
    "Hi! You have an outstanding PayLoop invoice #42 for 1 USDC (Website redesign). Please pay it here: https://payloop.example/pay/42"
  );
});

test("buildReminder falls back when description is empty", () => {
  const message = buildReminder({ ...invoice, description: "" }, "https://payloop.example");
  assert.match(message, /\(no description\)/);
  assert.match(message, /\/pay\/42$/);
});

test("buildReminder uses the invoice token symbol and decimals", () => {
  const message = buildReminder(
    { ...invoice, amount: 2500n },
    "https://payloop.example",
    { symbol: "XLM", decimals: 2 }
  );
  assert.match(message, /for 25 XLM \(Website redesign\)/);
});

test("buildWhatsAppUrl encodes the reminder message", () => {
  const url = buildWhatsAppUrl("hello & pay");
  assert.equal(url, "https://wa.me/?text=hello%20%26%20pay");
});

test("buildEmailUrl pre-fills subject and body", () => {
  const url = buildEmailUrl(invoice, "pay me");
  assert.match(url, /^mailto:\?/);
  assert.match(url, /subject=Payment%20reminder%3A%20PayLoop%20invoice%20%2342/);
  assert.match(url, /body=pay%20me/);
});
