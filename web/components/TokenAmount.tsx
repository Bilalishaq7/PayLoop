"use client";

import { formatAmount } from "@/lib/format";
import { useTokenMeta } from "@/lib/use-token-meta";

// Renders an on-chain amount using the decimals and symbol of the token
// recorded on the invoice, not the deployment-wide defaults.
export function TokenAmount({
  amount,
  tokenId,
  className,
  symbolClassName = "text-xs font-normal text-slate-400",
}: {
  amount: bigint;
  tokenId?: string;
  className?: string;
  symbolClassName?: string;
}) {
  const meta = useTokenMeta(tokenId);
  return (
    <span className={className}>
      {formatAmount(amount, meta.decimals)}{" "}
      <span className={symbolClassName}>{meta.symbol}</span>
    </span>
  );
}
