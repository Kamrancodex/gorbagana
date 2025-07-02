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
      process.env.NEXT_PUBLIC_GORBAGANA_RPC_URL ||
      process.env.NEXT_PUBLIC_SOLANA_RPC_URL ||
      "https://api.devnet.solana.com"
    );
  }, []);

  // Detect if we're on mobile for mobile-specific wallet handling
  const isMobile = useMemo(() => {
    if (typeof window === "undefined") return false;
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );
  }, []);

  // Configure multiple wallet adapters for better compatibility
  const wallets = useMemo(() => {
    const walletAdapters = [];

    try {
      // Primary: Phantom (better mobile support)
      walletAdapters.push(new PhantomWalletAdapter());
    } catch (error) {
      console.log("Phantom wallet not available:", error);
    }

    try {
      // Secondary: Solflare (good mobile support)
      walletAdapters.push(new SolflareWalletAdapter());
    } catch (error) {
      console.log("Solflare wallet not available:", error);
    }

    try {
      // Tertiary: Backpack (for Gorbagana when available)
      walletAdapters.push(new BackpackWalletAdapter());
    } catch (error) {
      console.log("Backpack wallet not available:", error);
    }

    console.log(
      `🦊 Configured ${walletAdapters.length} wallet adapters (Mobile: ${isMobile})`
    );
    return walletAdapters;
  }, [isMobile]);

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
        autoConnect={isMobile} // Enable auto-connect on mobile for better UX
        onError={(error) => {
          console.warn("Wallet error:", error);

          // Handle mobile-specific wallet errors
          if (isMobile && error.message?.includes("User rejected")) {
            console.log("Mobile user cancelled wallet connection");
            return; // Don't show error for user cancellation
          }

          // Don't throw for wallet not ready errors
          if (
            error.name !== "WalletNotReadyError" &&
            error.name !== "WalletNotSelectedError"
          ) {
            console.error("Critical wallet error:", error);

            // Show mobile-friendly error message
            if (isMobile) {
              setTimeout(() => {
                alert(
                  `Wallet connection failed. Please ensure your wallet app is installed and try again.\n\nError: ${error.message}`
                );
              }, 100);
            }
          }
        }}
      >
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
