"use client";

import {
  ConnectionProvider,
  WalletProvider,
} from "@solana/wallet-adapter-react";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import { BackpackWalletAdapter } from "@solana/wallet-adapter-backpack";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-phantom";
import { SolflareWalletAdapter } from "@solana/wallet-adapter-solflare";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { clusterApiUrl } from "@solana/web3.js";
import { useMemo, ReactNode, useEffect, useState } from "react";

// Import wallet adapter CSS
import "@solana/wallet-adapter-react-ui/styles.css";

interface WalletProvidersProps {
  children: ReactNode;
}

export function WalletProviders({ children }: WalletProvidersProps) {
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch by only rendering after mount
  useEffect(() => {
    setMounted(true);
  }, []);

  // Use Gorbagana testnet RPC endpoint
  const network = WalletAdapterNetwork.Devnet; // Keep devnet as base, but override endpoint
  const endpoint = useMemo(() => {
    // Gorbagana testnet RPC - replace with actual Gorbagana RPC URL when available
    return (
      process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "https://api.devnet.solana.com"
    );
  }, []);

  // Configure multiple wallet adapters for better compatibility
  const wallets = useMemo(() => {
    const walletAdapters = [];

    try {
      // Primary: Backpack (for Gorbagana)
      walletAdapters.push(new BackpackWalletAdapter());
    } catch (error) {
      console.log("Backpack wallet not available:", error);
    }

    try {
      // Fallback: Phantom
      walletAdapters.push(new PhantomWalletAdapter());
    } catch (error) {
      console.log("Phantom wallet not available:", error);
    }

    try {
      // Fallback: Solflare
      walletAdapters.push(new SolflareWalletAdapter());
    } catch (error) {
      console.log("Solflare wallet not available:", error);
    }

    console.log(`🦊 Configured ${walletAdapters.length} wallet adapters`);
    return walletAdapters;
  }, []);

  // Show loading state during hydration
  if (!mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-blue-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400 mx-auto mb-4"></div>
          <p className="text-gray-400">Initializing Gorbagana connection...</p>
        </div>
      </div>
    );
  }

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider
        wallets={wallets}
        autoConnect={false}
        onError={(error) => {
          console.warn("Wallet error:", error);
          // Don't throw for wallet not ready errors
          if (error.name !== "WalletNotReadyError") {
            console.error("Critical wallet error:", error);
          }
        }}
      >
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
