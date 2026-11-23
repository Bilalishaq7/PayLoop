"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { connectWallet, detectWallet } from "@/lib/wallet";
import { errorMessage } from "@/lib/async-resource";

type WalletContextValue = {
  address: string | null;
  network: string | null;
  installed: boolean;
  connecting: boolean;
  error: string | null;
  clearError: () => void;
  connect: () => Promise<void>;
  disconnect: () => void;
};

const WalletContext = createContext<WalletContextValue | null>(null);

const STORAGE_KEY = "payloop.wallet.connected";

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [network, setNetwork] = useState<string | null>(null);
  const [installed, setInstalled] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // On mount, re-hydrate if the user previously connected.
  useEffect(() => {
    let active = true;
    (async () => {
      const state = await detectWallet();
      if (!active) return;
      setInstalled(state.installed);
      if (state.address && localStorage.getItem(STORAGE_KEY)) {
        setAddress(state.address);
        setNetwork(state.network);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const connect = useCallback(async () => {
    setConnecting(true);
    setError(null);
    try {
      const addr = await connectWallet();
      const state = await detectWallet();
      setAddress(addr);
      setNetwork(state.network);
      setInstalled(true);
      localStorage.setItem(STORAGE_KEY, "1");
    } catch (e) {
      const message = errorMessage(e, "Failed to connect wallet.");
      setError(message);
      if (message.toLowerCase().includes("not found")) {
        setInstalled(false);
      }
    } finally {
      setConnecting(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const disconnect = useCallback(() => {
    setAddress(null);
    setNetwork(null);
    setError(null);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const value = useMemo(
    () => ({
      address,
      network,
      installed,
      connecting,
      error,
      clearError,
      connect,
      disconnect,
    }),
    [
      address,
      network,
      installed,
      connecting,
      error,
      clearError,
      connect,
      disconnect,
    ],
  );

  return (
    <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
  );
}

export function useWallet(): WalletContextValue {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used within WalletProvider");
  return ctx;
}
