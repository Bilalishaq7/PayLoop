import test from "node:test";
import assert from "node:assert/strict";
import { createLatestGuard, errorMessage } from "../async-resource.ts";

// ── latest-response guard ───────────────────────────────────────────────────

test("a new ticket is current until another one is issued", () => {
  const guard = createLatestGuard();
  const first = guard.next();
  assert.equal(guard.isCurrent(first), true);
  const second = guard.next();
  assert.equal(guard.isCurrent(first), false);
  assert.equal(guard.isCurrent(second), true);
});

test("cancel makes every outstanding ticket stale", () => {
  const guard = createLatestGuard();
  const ticket = guard.next();
  guard.cancel();
  assert.equal(guard.isCurrent(ticket), false);
});

test("a ticket issued after cancel is current again", () => {
  const guard = createLatestGuard();
  guard.next();
  guard.cancel();
  assert.equal(guard.isCurrent(guard.next()), true);
});

test("a slow earlier response loses to a later one", async () => {
  const guard = createLatestGuard();
  const applied = [];
  const load = async (label, delay) => {
    const ticket = guard.next();
    await new Promise((resolve) => setTimeout(resolve, delay));
    if (guard.isCurrent(ticket)) applied.push(label);
  };
  await Promise.all([load("slow", 20), load("fast", 1)]);
  assert.deepEqual(applied, ["fast"]);
});

// ── error text ──────────────────────────────────────────────────────────────

test("errorMessage uses the error's own message", () => {
  assert.equal(errorMessage(new Error("RPC down"), "fallback"), "RPC down");
  assert.equal(errorMessage({ message: "plain object" }, "fallback"), "plain object");
});

test("errorMessage falls back when there is no usable message", () => {
  assert.equal(errorMessage(undefined, "fallback"), "fallback");
  assert.equal(errorMessage(null, "fallback"), "fallback");
  assert.equal(errorMessage("a string", "fallback"), "fallback");
  assert.equal(errorMessage(new Error(""), "fallback"), "fallback");
  assert.equal(errorMessage({ message: 42 }, "fallback"), "fallback");
});
