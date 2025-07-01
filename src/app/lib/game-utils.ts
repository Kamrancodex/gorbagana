// Unified game utilities for consistent payment and balance logic across all games

import { WalletContextState } from "@solana/wallet-adapter-react";
import { getBalanceForDisplay, payEntryFeeForDisplay } from "./blockchain";
import {
  getMockBalance,
  payMockEntryFee,
  getMockWalletAddress,
  generateMockTxSignature,
} from "./mock-wallet";

// Check if we're in mock mode
export const isMockMode = (): boolean => {
  if (typeof window === "undefined") return false;
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get("mock") === "true";
};

// Get wallet address for current mode
export const getWalletAddress = (publicKey: any): string | null => {
  if (isMockMode()) {
    return getMockWalletAddress();
  }
  return publicKey?.toBase58() || null;
};

// Get balance for current mode
export const getGameBalance = async (publicKey: any): Promise<number> => {
  if (isMockMode()) {
    return getMockBalance();
  }

  if (!publicKey) return 0;
  return await getBalanceForDisplay(publicKey.toBase58());
};

// Check if wallet connection is required
export const requiresWalletConnection = (connected: boolean): boolean => {
  if (isMockMode()) {
    return false; // Mock mode doesn't need wallet connection
  }
  return !connected; // Real mode requires wallet connection
};

// Unified payment function for all games
export const processGamePayment = async (
  wallet: WalletContextState,
  betAmount: number,
  gameId: string
): Promise<{ success: boolean; txSignature?: string; error?: string }> => {
  if (isMockMode()) {
    // Mock mode payment
    const mockResult = payMockEntryFee(betAmount, gameId);
    return {
      success: mockResult.success,
      txSignature: mockResult.success ? generateMockTxSignature() : undefined,
      error: mockResult.error,
    };
  } else {
    // Real mode payment
    if (!wallet.publicKey) {
      return { success: false, error: "Wallet not connected" };
    }

    return await payEntryFeeForDisplay(wallet, betAmount, gameId);
  }
};

// Get display text for current mode
export const getGameModeText = (): string => {
  return isMockMode() ? " (Demo)" : "";
};

// Get balance display text
export const getBalanceDisplayText = (balance: number): string => {
  return `${balance.toFixed(2)} GOR${getGameModeText()}`;
};

// Validate payment requirements
export const validatePaymentRequirements = async (
  wallet: WalletContextState,
  betAmount: number
): Promise<{ valid: boolean; error?: string }> => {
  if (isMockMode()) {
    // Check mock balance
    const mockBalance = getMockBalance();
    if (mockBalance < betAmount) {
      return {
        valid: false,
        error: `Insufficient mock balance. Need ${betAmount} GOR, have ${mockBalance.toFixed(
          2
        )} GOR`,
      };
    }
    return { valid: true };
  } else {
    // Check real wallet connection and balance
    if (!wallet.publicKey || !wallet.connected) {
      return {
        valid: false,
        error: "Please connect your wallet first",
      };
    }

    const realBalance = await getBalanceForDisplay(wallet.publicKey.toBase58());
    if (realBalance < betAmount) {
      return {
        valid: false,
        error: `Insufficient balance. Need ${betAmount} GOR, have ${realBalance.toFixed(
          2
        )} GOR`,
      };
    }
    return { valid: true };
  }
};
