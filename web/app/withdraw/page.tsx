"use client";

import { useEffect, useState } from "react";
import { useWallet } from "@/components/WalletProvider";
import { ConnectPrompt } from "@/components/ConnectPrompt";
import { Alert, Spinner } from "@/components/ui";
import { getTokenBalance } from "@/lib/contract";
import { formatAmount, formatNaira, fromBaseUnits } from "@/lib/format";
import { bankByCode } from "@/lib/banks";
import { BankSelect } from "@/components/BankSelect";
import { config, NGN_PER_USDC } from "@/lib/config";

// Mocked USDC -> Naira off-ramp. A production build would hand off to a licensed
// anchor over SEP-24; here we simulate the anchor UX end-to-end so the payout
// story is complete for the demo. No real funds move.

type Stage = "form" | "processing" | "done";

export default function WithdrawPage() {
  const { address } = useWallet();
  const [balance, setBalance] = useState<bigint | null>(null);
  const [amount, setAmount] = useState("");
  const [bank, setBank] = useState("");
  const [accountNo, setAccountNo] = useState("");
  const [stage, setStage] = useState<Stage>("form");
  const [error, setError] = useState<string | null>(null);
  const [ref, setRef] = useState("");

  useEffect(() => {
    if (address)
      getTokenBalance(address)
        .then(setBalance)
        .catch(() => {});
  }, [address]);

  const naira = amount ? Number(amount) * NGN_PER_USDC : 0;
  const bankName = bankByCode(bank)?.name ?? "";

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const n = Number(amount);
    if (!Number.isFinite(n) || n <= 0) {
      setError("Enter an amount greater than zero.");
      return;
    }
    if (balance !== null && n > Number(fromBaseUnits(balance))) {
      setError("Amount exceeds your available balance.");
      return;
    }
    if (accountNo.replace(/\D/g, "").length < 10) {
      setError("Enter a valid 10-digit account number.");
      return;
    }
    if (!bank) {
      setError("Select your bank.");
      return;
    }
    setStage("processing");
    // Simulate anchor settlement time.
    setTimeout(() => {
      setRef(`PL-${Date.now().toString(36).toUpperCase()}`);
      setStage("done");
    }, 2200);
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Withdraw to Naira</h1>
        <p className="mt-1 text-sm text-slate-400">
          Convert your {config.tokenSymbol} to NGN and send it to your bank
          account.
        </p>
      </div>

      <Alert kind="info">
        Demo anchor: this simulates a licensed off-ramp (SEP-24). No real bank
        transfer occurs and no on-chain funds move.
      </Alert>

      {!address ? (
        <ConnectPrompt message="Connect your wallet to withdraw." />
      ) : stage === "done" ? (
        <div className="card space-y-4 text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-emerald-500/15 text-3xl">
            ✓
          </div>
          <div>
            <p className="text-xl font-bold">Withdrawal initiated</p>
            <p className="mt-1 text-sm text-slate-400">
              ₦{naira.toLocaleString()} is on its way to your {bank} account
              ending {accountNo.slice(-4)}.
            </p>
          </div>
          <div className="rounded-lg bg-ink-900/60 p-3 text-sm">
            <span className="text-slate-500">Reference</span>{" "}
            <span className="font-mono">{ref}</span>
          </div>
          <button
            className="btn-ghost w-full"
            onClick={() => {
              setStage("form");
              setAmount("");
              setAccountNo("");
              setBank("");
            }}
          >
            Make another withdrawal
          </button>
        </div>
      ) : (
        <form onSubmit={submit} className="card space-y-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-400">Available</span>
            <span className="font-semibold">
              {balance === null ? "—" : formatAmount(balance)}{" "}
              {config.tokenSymbol}
            </span>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label className="label" htmlFor="amt">
                Amount ({config.tokenSymbol})
              </label>
              <button
                type="button"
                className="mb-1 text-xs font-medium text-brand-400 hover:text-brand-300 disabled:text-slate-600"
                disabled={balance === null || stage === "processing"}
                onClick={() => balance !== null && setAmount(fromBaseUnits(balance))}
              >
                Max
              </button>
            </div>
            <input
              id="amt"
              className="input"
              inputMode="decimal"
              placeholder="100.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={stage === "processing"}
            />
            {naira > 0 && (
              <p className="mt-1.5 text-sm text-slate-400">
                You&apos;ll receive ≈{" "}
                <span className="font-semibold text-slate-200">
                  {formatNaira(naira)}
                </span>{" "}
                <span className="text-slate-500">
                  ({formatNaira(NGN_PER_USDC)}/{config.tokenSymbol})
                </span>
              </p>
            )}
          </div>

          <div>
            <label className="label" htmlFor="bank">
              Bank
            </label>
            <BankSelect
              id="bank"
              value={bank}
              onChange={setBank}
              disabled={stage === "processing"}
            />
          </div>

          <div>
            <label className="label" htmlFor="acct">
              Account number
            </label>
            <input
              id="acct"
              className="input"
              inputMode="numeric"
              placeholder="0123456789"
              value={accountNo}
              onChange={(e) => setAccountNo(e.target.value)}
              maxLength={10}
              disabled={stage === "processing"}
            />
          </div>

          {error && <Alert kind="error">{error}</Alert>}

          <button
            type="submit"
            disabled={stage === "processing"}
            className="btn-primary w-full"
          >
            {stage === "processing" ? (
              <>
                <Spinner /> Contacting anchor…
              </>
            ) : (
              "Withdraw to bank"
            )}
          </button>
        </form>
      )}
    </div>
  );
}
