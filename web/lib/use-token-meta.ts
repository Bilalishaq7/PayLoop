"use client";

import { useEffect, useState } from "react";
import { getTokenConfig } from "./config";
import { getTokenMetadata, type TokenMetadata } from "./contract";

// Resolves display metadata for an invoice's token. The configured values are
// used immediately (and as a fallback), then the token contract wins.
export function useTokenMeta(tokenId?: string): TokenMetadata {
  const fallback = getTokenConfig(tokenId);
  const [meta, setMeta] = useState<TokenMetadata>({
    symbol: fallback.symbol,
    decimals: fallback.decimals,
  });

  useEffect(() => {
    let active = true;
    const initial = getTokenConfig(tokenId);
    setMeta({ symbol: initial.symbol, decimals: initial.decimals });
    getTokenMetadata(tokenId)
      .then((resolved) => {
        if (active) setMeta(resolved);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [tokenId]);

  return meta;
}
