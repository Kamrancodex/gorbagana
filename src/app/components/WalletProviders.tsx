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

  // Enhanced mobile detection with additional checks
  const isMobile = useMemo(() => {
    if (typeof window === "undefined") return false;

    // Check user agent
    const userAgent =
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      );

    // Check screen size
    const screenSize =
      window.screen.width <= 768 || window.screen.height <= 768;

    // Check touch support
    const touchSupport =
      "ontouchstart" in window || navigator.maxTouchPoints > 0;

    return userAgent || (screenSize && touchSupport);
  }, []);

  // Configure wallet adapters with mobile-specific settings
  const wallets = useMemo(() => {
    const walletAdapters = [];

    // Mobile-optimized wallet configuration
    if (isMobile) {
      try {
        // Phantom - best mobile support
        walletAdapters.push(new PhantomWalletAdapter());
      } catch (error) {
        console.log("Phantom mobile wallet not available:", error);
      }

      try {
        // Backpack - better for mobile than Solflare
        walletAdapters.push(new BackpackWalletAdapter());
      } catch (error) {
        console.log("Backpack mobile wallet not available:", error);
      }
    } else {
      // Desktop wallet configuration
      try {
        walletAdapters.push(new PhantomWalletAdapter());
      } catch (error) {
        console.log("Phantom wallet not available:", error);
      }

      try {
        walletAdapters.push(new SolflareWalletAdapter());
      } catch (error) {
        console.log("Solflare wallet not available:", error);
      }

      try {
        walletAdapters.push(new BackpackWalletAdapter());
      } catch (error) {
        console.log("Backpack wallet not available:", error);
      }
    }

    console.log(
      `🦊 Configured ${walletAdapters.length} wallet adapters (Mobile: ${isMobile})`
    );
    return walletAdapters;
  }, [isMobile, network]);

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
        autoConnect={false} // Always false to prevent issues, let users manually connect
        onError={(error) => {
          console.warn("Wallet error:", error);

          // Enhanced mobile error handling
          if (isMobile) {
            // Handle common mobile wallet errors
            if (error.message?.includes("User rejected")) {
              console.log("Mobile user cancelled wallet connection");
              return; // Don't show error for user cancellation
            }

            if (
              error.message?.includes("Wallet not found") ||
              error.name === "WalletNotFoundError"
            ) {
              console.log("Mobile wallet app not installed");
              setTimeout(() => {
                alert(
                  "Wallet app not found. Please install Phantom or Backpack from your app store and try again."
                );
              }, 100);
              return;
            }

            if (
              error.message?.includes("timeout") ||
              error.message?.includes("Failed to fetch")
            ) {
              console.log("Mobile wallet connection timeout");
              setTimeout(() => {
                alert(
                  "Connection timed out. Please make sure your wallet app is running and try again."
                );
              }, 100);
              return;
            }
          }

          // Don't throw for wallet not ready errors
          if (
            error.name !== "WalletNotReadyError" &&
            error.name !== "WalletNotSelectedError" &&
            error.name !== "WalletNotFoundError"
          ) {
            console.error("Critical wallet error:", error);

            // Show user-friendly error message
            if (isMobile) {
              setTimeout(() => {
                alert(
                  `Wallet connection failed. Please try:\n\n1. Make sure your wallet app is installed\n2. Open the wallet app first\n3. Try connecting again\n\nError: ${error.message}`
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
