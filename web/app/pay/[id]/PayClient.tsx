"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useWallet } from "@/components/WalletProvider";
import { Alert, Spinner, StatusBadge, TxLink } from "@/components/ui";
import { InvoicePreview } from "@/components/InvoiceDocument";
import { TrustlineButton } from "@/components/TrustlineButton";
import { FaucetButton } from "@/components/FaucetButton";
import {
  fundInvoice,
  getInvoice,
  getTokenBalance,
  hasTokenTrustline,
  type Invoice,
} from "@/lib/contract";
import { formatAmount, formatDate, humanizeDescription, shortAddress } from "@/lib/format";
import { config, isConfigured } from "@/lib/config";
import { useTokenMeta } from "@/lib/use-token-meta";

export default function PayClient({ id }: { id: string }) {
  const { address, connect, connecting } = useWallet();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [balance, setBalance] = useState<bigint | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paidHash, setPaidHash] = useState<string | null>(null);
  const [trusted, setTrusted] = useState<boolean | null>(null);
  const [receiptOpen, setReceiptOpen] = useState(false);
  // Whether the freelancer (recipient) can receive USDC. If they haven't
  // enabled the trustline, the transfer fails on-chain (Error #13), so we gate
  // the Pay button on this and show a clear message instead.
  const [freelancerReady, setFreelancerReady] = useState<boolean | null>(null);
  const token = useTokenMeta(invoice?.token);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const inv = await getInvoice(id);
      if (!inv) {
        setNotFound(true);
      } else {
        setInvoice(inv);
      }
    } catch (e: any) {
      setError(e?.message ?? "Failed to load invoice.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  // Check the freelancer (recipient) can receive this token whenever the
  // invoice loads — the required trustline depends on the invoice's token.
  useEffect(() => {
    if (!invoice) {
      setFreelancerReady(null);
      return;
    }
    hasTokenTrustline(invoice.freelancer, invoice.token)
      .then(setFreelancerReady)
      .catch(() => setFreelancerReady(null));
  }, [invoice, paidHash]);

  useEffect(() => {
    if (!address || !invoice) {
      setTrusted(null);
      setBalance(null);
      return;
    }
    getTokenBalance(address, invoice.token).then(setBalance).catch(() => {});
    hasTokenTrustline(address, invoice.token)
      .then(setTrusted)
      .catch(() => setTrusted(null));
  }, [address, invoice, paidHash]);

  async function pay() {
    if (!address || !invoice) return;
    setError(null);
    setPaying(true);
    try {
      const res = await fundInvoice(address, invoice.id);
      setPaidHash(res.hash);
      await load();
    } catch (e: any) {
      const raw = String(e?.message ?? "");
      // Translate the most common on-chain failure into plain language.
      if (raw.includes("trustline entry is missing")) {
        setFreelancerReady(false);
        setError(
          `The freelancer hasn't enabled ${token.symbol} yet, so they can't receive this payment. Ask them to enable it, then try again.`
        );
      } else {
        setError(raw || "Payment failed.");
      }
    } finally {
      setPaying(false);
    }
  }

  if (!isConfigured()) {
    return (
      <Alert kind="info">
        The contract isn&apos;t configured yet.
      </Alert>
    );
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-lg">
        <div className="card h-64 animate-pulse bg-white/5" />
        <p className="mt-3 text-center text-xs text-slate-500">
          Loading invoice from chain…
        </p>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="mx-auto max-w-lg">
        <Alert kind="error">
          Invoice #{id} doesn&apos;t exist.{" "}
          <Link href="/dashboard" className="underline">
            Go to dashboard
          </Link>
        </Alert>
      </div>
    );
  }

  if (!invoice) return null;

  const isClient = address === invoice.client;
  const isPaid = invoice.status === "Paid";
  const insufficient =
    balance !== null && balance < invoice.amount && isClient && !isPaid;

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold">Invoice #{invoice.id}</h1>
        <p className="mt-1 text-sm text-slate-400">
          Payment request from {shortAddress(invoice.freelancer)}
        </p>
      </div>

      <div className="card space-y-5">
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-400">Amount due</span>
          <StatusBadge status={invoice.status} />
        </div>
        <div className="text-center">
          <div className="text-4xl font-bold">
            {formatAmount(invoice.amount, token.decimals)}
          </div>
          <div className="mt-1 text-slate-400">{token.symbol}</div>
        </div>

        <div className="space-y-2 rounded-lg bg-ink-900/60 p-4 text-sm">
          <Row label="Description" value={humanizeDescription(invoice.description) || "—"} />
          <Row label="From (freelancer)" value={shortAddress(invoice.freelancer)} mono />
          <Row label="To (client)" value={shortAddress(invoice.client)} mono />
          {invoice.dueDate > 0n && (
            <Row label="Due date" value={formatDate(invoice.dueDate)} />
          )}
          {isPaid && (
            <Row label="Paid on" value={formatDate(invoice.paidAt)} />
          )}
        </div>

        {(paidHash || isPaid) && (
          <Alert kind="success">
            <p className="font-semibold">Payment complete 🎉</p>
            <p className="mt-1">
              {formatAmount(invoice.amount, token.decimals)} {token.symbol} was
              sent to the freelancer.
            </p>
            {paidHash && (
              <p className="mt-1">
                <TxLink hash={paidHash} />
              </p>
            )}
            <button
              onClick={() => setReceiptOpen(true)}
              className="btn-ghost mt-3 text-sm"
            >
              ⬇ Download PDF receipt
            </button>
          </Alert>
        )}

        {error && (
          <Alert kind="error">
            <span>{error}</span>{" "}
            <button onClick={load} className="ml-2 underline">
              Retry
            </button>
          </Alert>
        )}

        {!isPaid && (
          <>
            {!address ? (
              <button
                onClick={connect}
                disabled={connecting}
                className="btn-primary w-full"
              >
                {connecting ? "Connecting…" : "Connect wallet to pay"}
              </button>
            ) : !isClient ? (
              <Alert kind="info">
                This invoice is addressed to {shortAddress(invoice.client)}.
                Connect that wallet to pay it.
              </Alert>
            ) : trusted === false ? (
              <TrustlineButton
                tokenId={invoice.token}
                onDone={() => setTrusted(true)}
              />
            ) : freelancerReady === false ? (
              <Alert kind="info">
                <p className="font-semibold">
                  This freelancer can&apos;t receive {token.symbol} yet.
                </p>
                <p className="mt-1">
                  {shortAddress(invoice.freelancer)} needs to enable{" "}
                  {token.symbol} before this invoice can be paid. Ask them to
                  open PayLoop, connect this wallet, and enable the token — then
                  refresh this page.
                </p>
                <button
                  onClick={() =>
                    hasTokenTrustline(invoice.freelancer, invoice.token)
                      .then(setFreelancerReady)
                      .catch(() => {})
                  }
                  className="btn-ghost mt-3 text-sm"
                >
                  Re-check
                </button>
              </Alert>
            ) : (
              <>
                {insufficient && (
                  <Alert kind="info">
                    <p>
                      Your balance is {formatAmount(balance ?? 0n, token.decimals)}{" "}
                      {token.symbol}, but this invoice is for{" "}
                      {formatAmount(invoice.amount, token.decimals)} {token.symbol}.
                      {invoice.token === config.tokenId
                        ? " Grab test tokens to continue:"
                        : ` Grab ${token.symbol} from its issuer to continue:`}
                    </p>
                    {invoice.token === config.tokenId && (
                      <div className="mt-2">
                        <FaucetButton
                          onDone={() =>
                            getTokenBalance(address, invoice.token)
                              .then(setBalance)
                              .catch(() => {})
                          }
                        />
                      </div>
                    )}
                  </Alert>
                )}
                <button
                  onClick={pay}
                  disabled={paying || insufficient}
                  className="btn-primary w-full"
                >
                  {paying ? (
                    <>
                      <Spinner /> Paying…
                    </>
                  ) : (
                    `Pay ${formatAmount(invoice.amount, token.decimals)} ${token.symbol}`
                  )}
                </button>
                <p className="text-center text-xs text-slate-500">
                  Funds transfer directly to the freelancer on-chain.
                </p>
              </>
            )}
          </>
        )}
      </div>

      <InvoicePreview
        invoice={invoice}
        open={receiptOpen}
        onClose={() => setReceiptOpen(false)}
        confirmLabel=""
      />
    </div>
  );
}

function Row({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-slate-500">{label}</span>
      <span className={mono ? "font-mono text-xs" : ""}>{value}</span>
    </div>
  );
}
