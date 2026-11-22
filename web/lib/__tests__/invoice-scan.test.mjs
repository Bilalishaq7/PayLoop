import test from "node:test";
import assert from "node:assert/strict";
import { createScanCache, scanInvoices } from "../invoice-scan.ts";
import { scanStatusMessage } from "../scan-status.ts";

const invoice = (id) => ({ id: String(id) });

test("stops cleanly at the first missing id", async () => {
  const seen = [];
  const result = await scanInvoices(
    async (id) => {
      seen.push(id);
      return id <= 3 ? invoice(id) : null;
    },
    { max: 10, batchSize: 2 }
  );

  assert.deepEqual(
    result.invoices.map((item) => item.id),
    ["1", "2", "3"]
  );
  assert.equal(result.error, null);
  assert.equal(result.reachedCap, false);
  assert.equal(result.scannedThrough, 4);
  assert.deepEqual(seen, [1, 2, 3, 4]);
});

test("an RPC error at id 40 keeps the 39 earlier invoices and flags failure", async () => {
  const result = await scanInvoices(
    async (id) => {
      if (id === 40) throw new Error("Soroban offline");
      return invoice(id);
    },
    { max: 250, batchSize: 10 }
  );

  assert.equal(result.invoices.length, 39);
  assert.equal(result.invoices.at(-1).id, "39");
  assert.equal(result.error, "Soroban offline");
  assert.equal(result.reachedCap, false);
  assert.equal(result.scannedThrough, 40);
});

test("batched results stay in id order even when later ids resolve first", async () => {
  const result = await scanInvoices(
    async (id) => {
      await new Promise((resolve) => setTimeout(resolve, id === 2 ? 20 : 1));
      return invoice(id);
    },
    { max: 5, batchSize: 5 }
  );

  assert.deepEqual(
    result.invoices.map((item) => item.id),
    ["1", "2", "3", "4", "5"]
  );
  assert.equal(result.reachedCap, true);
  assert.equal(result.error, null);
});

test("non-Error throws are surfaced with a readable message", async () => {
  const result = await scanInvoices(
    async (id) => {
      if (id === 1) throw "plain failure";
      return invoice(id);
    },
    { max: 1 }
  );

  assert.equal(result.error, "plain failure");
  assert.deepEqual(result.invoices, []);
});

test("invalid scan options are rejected", async () => {
  await assert.rejects(
    () => scanInvoices(async () => null, { max: 3, batchSize: 0 }),
    RangeError
  );
  await assert.rejects(
    () => scanInvoices(async () => null, { startId: 5, max: 3 }),
    RangeError
  );
});

test("cache shares concurrent loads, expires, clears and evicts failures", async () => {
  let now = 1000;
  let calls = 0;
  const cache = createScanCache(30, () => now);
  const load = async () => ++calls;

  const [first, second] = await Promise.all([cache.get(load), cache.get(load)]);
  assert.equal(first, 1);
  assert.equal(second, 1);
  assert.equal(calls, 1);

  now += 29;
  assert.equal(await cache.get(load), 1);
  now += 2;
  assert.equal(await cache.get(load), 2);

  cache.clear();
  assert.equal(await cache.get(load), 3);

  cache.clear();
  let attempts = 0;
  const failing = async () => {
    attempts += 1;
    throw new Error("offline");
  };
  await assert.rejects(() => cache.get(failing), /offline/);
  await assert.rejects(() => cache.get(failing), /offline/);
  assert.equal(attempts, 2);
});

test("status copy covers failure, cap and the quiet case", () => {
  assert.match(
    scanStatusMessage({
      error: "Soroban offline",
      reachedCap: false,
      count: 39,
      scannedThrough: 40,
    }),
    /stopped at #40.*39 invoices/
  );
  assert.match(
    scanStatusMessage({
      error: null,
      reachedCap: true,
      count: 250,
      scannedThrough: 250,
    }),
    /first 250 invoices/
  );
  assert.equal(
    scanStatusMessage({
      error: null,
      reachedCap: false,
      count: 5,
      scannedThrough: 5,
    }),
    null
  );
});
