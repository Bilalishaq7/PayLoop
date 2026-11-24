// Pure logic for the printable income statement (/statement). Kept free of
// React and config imports so it can be unit tested with plain `node --test`
// (see lib/__tests__/statement.test.mjs).

export type StatementInvoice = {
  id: string;
  freelancer: string;
  client: string;
  token: string;
  amount: bigint;
  description: string;
  status: "Pending" | "Paid";
  /** Unix seconds when the invoice was funded; 0 if not recorded. */
  paidAt: bigint;
};

export type StatementRange = {
  /** Inclusive start, unix seconds (local midnight of the first day). */
  startSec: bigint;
  /** Exclusive end, unix seconds (local midnight after the last day). */
  endSec: bigint;
};

export type RangeResult =
  | { ok: true; range: StatementRange }
  | { ok: false; error: string };

export type Statement = {
  rows: StatementInvoice[];
  /** Total paid per token id, in the token's base units, in first-seen order. */
  totals: Array<{ token: string; amount: bigint }>;
  /** Paid invoices that were skipped because they have no recorded paid date. */
  undated: number;
};

const DATE_INPUT = /^(\d{4})-(\d{2})-(\d{2})$/;

// Local midnight of a `YYYY-MM-DD` value, in unix seconds. Local time matches
// what the person sees in a date input and in the History page's dates.
function localMidnightSeconds(value: string, addDays = 0): bigint | null {
  const match = DATE_INPUT.exec(value);
  if (!match) return null;
  const [y, m, d] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(y, m - 1, d + addDays);
  // Reject dates such as 2026-02-31 that `Date` would silently roll over.
  if (addDays === 0 && (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d)) {
    return null;
  }
  return BigInt(Math.floor(date.getTime() / 1000));
}

/** Turn two date-input values into a half-open range covering both whole days. */
export function parseRange(from: string, to: string): RangeResult {
  const startSec = localMidnightSeconds(from);
  const lastDay = localMidnightSeconds(to);
  if (startSec === null || lastDay === null) {
    return { ok: false, error: "Choose a start and an end date." };
  }
  if (from > to) {
    return { ok: false, error: "The start date must be on or before the end date." };
  }
  const endSec = localMidnightSeconds(to, 1);
  if (endSec === null) return { ok: false, error: "Choose a start and an end date." };
  return { ok: true, range: { startSec, endSec } };
}

/**
 * Paid invoices the wallet received as the freelancer, paid inside the range,
 * oldest first, with a total per token. Pending invoices, invoices the wallet
 * only paid as a client, and anything outside the range are left out.
 */
export function buildStatement(
  invoices: readonly StatementInvoice[],
  address: string,
  range: StatementRange
): Statement {
  let undated = 0;
  const rows = invoices.filter((invoice) => {
    if (invoice.status !== "Paid" || invoice.freelancer !== address) return false;
    if (invoice.paidAt <= 0n) {
      undated += 1;
      return false;
    }
    return invoice.paidAt >= range.startSec && invoice.paidAt < range.endSec;
  });

  rows.sort((a, b) => {
    if (a.paidAt !== b.paidAt) return a.paidAt < b.paidAt ? -1 : 1;
    return Number(BigInt(a.id) - BigInt(b.id));
  });

  const byToken = new Map<string, bigint>();
  for (const row of rows) {
    byToken.set(row.token, (byToken.get(row.token) ?? 0n) + row.amount);
  }
  return {
    rows,
    totals: [...byToken].map(([token, amount]) => ({ token, amount })),
    undated,
  };
}

/** Document title so "Save as PDF" proposes a useful filename. */
export function statementTitle(from: string, to: string): string {
  const safe = (value: string) => value.replace(/[^0-9-]/g, "");
  return `PayLoop-Income-Statement-${safe(from)}-to-${safe(to)}`;
}
