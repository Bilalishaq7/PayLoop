#!/usr/bin/env node
// Read and create PayLoop invoices from Node.js, with @stellar/stellar-sdk.
//
//   node payloop.mjs read <invoiceId>
//   STELLAR_SECRET=S... node payloop.mjs create <clientAddress> <amount> "<description>" [dueDate]
//
// Defaults point at the public PayLoop testnet deployment. Override with
// PAYLOOP_CONTRACT_ID, RPC_URL and NETWORK_PASSPHRASE to use your own.
//
// `create` signs with the secret key in STELLAR_SECRET, which becomes the
// freelancer. Use a testnet key only, and never commit it.

import { pathToFileURL } from "node:url";
import {
  Account,
  Address,
  BASE_FEE,
  Contract,
  Keypair,
  TransactionBuilder,
  nativeToScVal,
  rpc,
  scValToNative,
} from "@stellar/stellar-sdk";

const CONTRACT_ID =
  process.env.PAYLOOP_CONTRACT_ID ?? "CAQVSBNVL7OI66IDTYCR7XL4VJKMSOYGBW5D6SWLTWTINTCQO2OGCSXS";
const RPC_URL = process.env.RPC_URL ?? "https://soroban-testnet.stellar.org";
const PASSPHRASE = process.env.NETWORK_PASSPHRASE ?? "Test SDF Network ; September 2015";

// Token amounts are integers in the token's smallest unit. The default PayLoop
// token (test USDC) has 7 decimals.
const DECIMALS = 7;
// A public testnet account used only as the source of read-only simulations.
const READ_SOURCE = "GBTDIHYJA4OPTDBDRKH5A5PHBSH7QVAEY46V27DCB24SXNRXIQNHSNUM";

const server = new rpc.Server(RPC_URL, { allowHttp: RPC_URL.startsWith("http://") });
const contract = new Contract(CONTRACT_ID);

/** "12.5" -> 125000000n */
function toBaseUnits(human) {
  if (!/^\d+(\.\d+)?$/.test(human)) throw new Error(`Invalid amount: ${human}`);
  const [whole, frac = ""] = human.split(".");
  if (frac.length > DECIMALS) throw new Error(`At most ${DECIMALS} decimal places.`);
  return BigInt(whole) * 10n ** BigInt(DECIMALS) + BigInt(frac.padEnd(DECIMALS, "0"));
}

/** 125000000n -> "12.5" */
function fromBaseUnits(base) {
  const divisor = 10n ** BigInt(DECIMALS);
  const frac = (base % divisor).toString().padStart(DECIMALS, "0").replace(/0+$/, "");
  return frac ? `${base / divisor}.${frac}` : `${base / divisor}`;
}

/** Read one invoice. Returns null when the id does not exist. */
export async function readInvoice(id) {
  const tx = new TransactionBuilder(new Account(READ_SOURCE, "0"), {
    fee: BASE_FEE,
    networkPassphrase: PASSPHRASE,
  })
    .addOperation(contract.call("get_invoice", nativeToScVal(BigInt(id), { type: "u64" })))
    .setTimeout(30)
    .build();

  const sim = await server.simulateTransaction(tx);
  if (rpc.Api.isSimulationError(sim)) {
    if (sim.error.includes("InvoiceNotFound")) return null;
    throw new Error(sim.error);
  }
  const raw = scValToNative(sim.result.retval);
  return {
    id: raw.id.toString(),
    freelancer: raw.freelancer,
    client: raw.client,
    token: raw.token,
    amount: fromBaseUnits(BigInt(raw.amount)),
    description: raw.description,
    dueDate: Number(raw.due_date), // unix seconds; 0 means none
    // The contract's status enum is 0 = Pending, 1 = Paid.
    status: raw.status === 1 || raw.status === "Paid" ? "Paid" : "Pending",
    createdAt: Number(raw.created_at),
    paidAt: Number(raw.paid_at),
  };
}

/**
 * Create an invoice as the freelancer whose secret key is given. Resolves with
 * the new invoice id and the transaction hash.
 */
export async function createInvoice({ secret, client, amount, description, dueDate = 0 }) {
  const keypair = Keypair.fromSecret(secret);
  const freelancer = keypair.publicKey();
  const account = await server.getAccount(freelancer);

  const built = new TransactionBuilder(account, { fee: BASE_FEE, networkPassphrase: PASSPHRASE })
    .addOperation(
      contract.call(
        "create_invoice",
        new Address(freelancer).toScVal(),
        new Address(client).toScVal(),
        nativeToScVal(toBaseUnits(amount), { type: "i128" }),
        nativeToScVal(description, { type: "string" }),
        nativeToScVal(BigInt(dueDate), { type: "u64" }),
      ),
    )
    .setTimeout(60)
    .build();

  // Simulate, then add the footprint, auth entries and resource fee.
  const prepared = await server.prepareTransaction(built);
  prepared.sign(keypair);

  const sent = await server.sendTransaction(prepared);
  if (sent.status === "ERROR") {
    throw new Error(`Submission failed: ${JSON.stringify(sent.errorResult)}`);
  }

  // Poll until the transaction is in a ledger.
  const started = Date.now();
  let result = await server.getTransaction(sent.hash);
  while (result.status === rpc.Api.GetTransactionStatus.NOT_FOUND && Date.now() - started < 30_000) {
    await new Promise((resolve) => setTimeout(resolve, 1500));
    result = await server.getTransaction(sent.hash);
  }
  if (result.status !== rpc.Api.GetTransactionStatus.SUCCESS) {
    throw new Error(`Transaction did not succeed (status: ${result.status}).`);
  }
  return { id: scValToNative(result.returnValue).toString(), hash: sent.hash };
}

async function main() {
  const [command, ...args] = process.argv.slice(2);

  if (command === "read" && args.length === 1) {
    const invoice = await readInvoice(args[0]);
    console.log(invoice ? JSON.stringify(invoice, null, 2) : `Invoice ${args[0]} does not exist.`);
    return;
  }

  if (command === "create" && args.length >= 3) {
    const secret = process.env.STELLAR_SECRET;
    if (!secret) throw new Error("Set STELLAR_SECRET to a testnet secret key (S...).");
    const [client, amount, description, dueDate] = args;
    const { id, hash } = await createInvoice({ secret, client, amount, description, dueDate });
    console.log(`Created invoice #${id} (tx ${hash}).`);
    console.log(`Read it back: node payloop.mjs read ${id}`);
    return;
  }

  console.error(
    [
      "Usage:",
      "  node payloop.mjs read <invoiceId>",
      '  STELLAR_SECRET=S... node payloop.mjs create <clientAddress> <amount> "<description>" [dueDate]',
    ].join("\n"),
  );
  process.exitCode = 1;
}

// Only run the CLI when executed directly, so the functions can be imported.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error.message ?? error);
    process.exitCode = 1;
  });
}
