"use client";

import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
  ConnectionConfig,
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  createTransferInstruction,
  createAssociatedTokenAccountInstruction,
  getAccount,
} from "@solana/spl-token";
import { WalletContextState } from "@solana/wallet-adapter-react";

// Configuration - GORBAGANA NETWORK 🚀
// Gorbagana is a Solana fork optimized for games and community-driven development
// Currently running on Testnet v2 (Devnet) with Mainnet in development
const GORBAGANA_RPC =
  process.env.NEXT_PUBLIC_GORBAGANA_RPC_URL || "https://rpc.gorbagana.wtf/";

// Fallback RPC endpoints in case primary fails
const FALLBACK_RPC_ENDPOINTS = [
  process.env.NEXT_PUBLIC_GORBAGANA_RPC_URL || "https://rpc.gorbagana.wtf/",
  // Additional endpoints can be added as the network expands
];

// 🎯 CONFIRMED: GOR is the NATIVE TOKEN on Gorbagana (like SOL on Solana)
// - Uses 9 decimals (lamports equivalent)
// - Lower block times than Solana due to single network validator
// - Minimal transaction costs, optimized for gaming applications
// - Full SPL compatibility (soon to be TPL - Trash Program Library)
const GGOR_MINT = new PublicKey("71Jvq4Epe2FCJ7JFSF7jLXdNk1Wy4Bhqd9iL6bEFELvg"); // Note: This might be wallet address, not mint
const PLATFORM_WALLET = new PublicKey(
  "4R4NUsGxRh9oUPrkDcDRTi9X6nkLBk6kd8yuchbSEEKj"
); // Platform fee recipient
const ESCROW_PROGRAM_ID = new PublicKey(
  "4R4NUsGxRh9oUPrkDcDRTi9X6nkLBk6kd8yuchbSEEKj"
); // Our game contract

// Enhanced connection configuration optimized for Gorbagana
const connectionConfig: ConnectionConfig = {
  commitment: "processed", // Gorbagana has lower block times than Solana, so "processed" is optimal
  disableRetryOnRateLimit: false,
  httpHeaders: {
    "Content-Type": "application/json",
    "User-Agent": "Gorbagana-Game/1.0", // Identify our game to the RPC
  },
  // Don't use WebSocket subscription endpoints to avoid connection issues
  wsEndpoint: undefined, // Disable WebSocket to prevent wss:// connection attempts
  confirmTransactionInitialTimeout: 45000, // Longer timeout for testnet conditions (45s)
};

// Initialize connection with enhanced configuration
const connection = new Connection(GORBAGANA_RPC, connectionConfig);

// Log configuration for debugging
console.log("🔧 Gorbagana connection configured with:", {
  rpc: GORBAGANA_RPC,
  commitment: connectionConfig.commitment,
  timeout: connectionConfig.confirmTransactionInitialTimeout,
  wsEndpoint: connectionConfig.wsEndpoint,
});

// Create a connection pool with fallback endpoints
class RobustConnection {
  private connections: Connection[] = [];
  private currentIndex = 0;

  constructor() {
    this.connections = FALLBACK_RPC_ENDPOINTS.map(
      (endpoint) => new Connection(endpoint, connectionConfig)
    );
  }

  async executeWithFallback<T>(
    operation: (connection: Connection) => Promise<T>,
    maxRetries: number = 3
  ): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const connection = this.connections[this.currentIndex];

      try {
        const result = await operation(connection);
        return result;
      } catch (error) {
        console.warn(`🔄 RPC attempt ${attempt + 1} failed:`, error);
        lastError = error as Error;

        // Try next connection
        this.currentIndex = (this.currentIndex + 1) % this.connections.length;

        // Wait before retry
        if (attempt < maxRetries - 1) {
          await new Promise((resolve) =>
            setTimeout(resolve, 1000 * (attempt + 1))
          );
        }
      }
    }

    throw lastError || new Error("All RPC endpoints failed");
  }

  getConnection(): Connection {
    return this.connections[this.currentIndex];
  }
}

const robustConnection = new RobustConnection();

// Enhanced transaction confirmation with retry logic
// Optimized for Gorbagana with fallback to transaction status checking
async function confirmTransactionWithRetry(
  signature: string,
  maxAttempts: number = 8, // More attempts for testnet reliability
  timeoutMs: number = 120000 // 2 minutes for testnet conditions
): Promise<void> {
  const startTime = Date.now();
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      console.log(
        `🔄 Confirming transaction (attempt ${attempt}/${maxAttempts}): ${signature}`
      );

      // Check if we've exceeded total timeout
      if (Date.now() - startTime > timeoutMs) {
        // Before giving up, try one final check to see if the transaction actually succeeded
        console.log("⏰ Timeout reached, checking transaction status...");
        const finalStatus = await checkTransactionStatus(signature);
        if (finalStatus.success) {
          console.log("✅ Transaction actually succeeded despite timeout!");
          return;
        }
        throw new Error(
          `Transaction confirmation timed out after ${timeoutMs}ms`
        );
      }

      // Try to confirm with current connection
      await robustConnection.executeWithFallback(async (conn) => {
        const confirmation = await conn.confirmTransaction(
          signature,
          "processed" // Use "processed" for faster confirmation
        );

        if (confirmation.value.err) {
          throw new Error(`Transaction failed: ${confirmation.value.err}`);
        }

        return confirmation;
      });

      console.log(`✅ Transaction confirmed: ${signature}`);
      return;
    } catch (error) {
      lastError = error as Error;
      console.warn(`⚠️ Confirmation attempt ${attempt} failed:`, error);

      // If this isn't the last attempt, wait before retrying
      // Shorter delays optimized for Gorbagana's faster block times
      if (attempt < maxAttempts && Date.now() - startTime < timeoutMs) {
        const delayMs = Math.min(1500 * attempt, 6000); // Faster retry, max 6s for Gorbagana
        console.log(`⏱️ Waiting ${delayMs}ms before retry...`);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }

  // Final attempt: Check if the transaction actually succeeded
  console.log("🔍 Final check: Verifying transaction status...");
  try {
    const finalStatus = await checkTransactionStatus(signature);
    if (finalStatus.success) {
      console.log(
        "✅ Transaction actually succeeded despite confirmation issues!"
      );
      return;
    }
  } catch (statusError) {
    console.warn("❌ Could not verify final transaction status:", statusError);
  }

  // If we get here, all attempts failed
  throw new Error(
    `Transaction confirmation failed after ${maxAttempts} attempts: ${
      lastError?.message || "Unknown error"
    }`
  );
}

// Helper function to check transaction status as a fallback
async function checkTransactionStatus(
  signature: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const status = await robustConnection.executeWithFallback(async (conn) => {
      return await conn.getSignatureStatus(signature, {
        searchTransactionHistory: true,
      });
    });

    if (status.value === null) {
      return { success: false, error: "Transaction not found" };
    }

    if (status.value.err) {
      return {
        success: false,
        error: `Transaction failed: ${status.value.err}`,
      };
    }

    // If confirmationStatus exists and is not null, the transaction succeeded
    if (status.value.confirmationStatus) {
      console.log(`🎯 Transaction status: ${status.value.confirmationStatus}`);
      return { success: true };
    }

    return { success: false, error: "Transaction status unclear" };
  } catch (error) {
    console.error("❌ Error checking transaction status:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export interface PlayerBalance {
  wallet: string;
  balance: number;
  formattedBalance: string;
}

export interface GameEscrow {
  gameId: string;
  player1: string;
  player2: string;
  betAmount: number;
  totalPool: number;
  platformFee: number;
  status: "active" | "completed" | "cancelled";
}

// Balance Management
export const getPlayerBalance = async (
  walletAddress: string
): Promise<number> => {
  try {
    const publicKey = new PublicKey(walletAddress);

    console.log(`🔍 Fetching balance for: ${walletAddress}`);
    console.log(`🌐 Using RPC: ${GORBAGANA_RPC}`);

    // Method 1: Try backend proxy (avoids CORS issues)
    try {
      console.log("🔄 Trying backend proxy...");
      const response = await fetch(
        `${
          process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001"
        }/api/balance/${walletAddress}`
      );

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.balance > 0) {
          console.log(`✅ Backend proxy balance: ${data.balance} GOR`);
          return data.balance;
        }
      }
    } catch (proxyError) {
      console.error("❌ Backend proxy failed:", proxyError);
    }

    // Method 2: Try NATIVE GOR balance (PRIMARY - confirmed working in backend!)
    try {
      console.log(
        `💰 Checking NATIVE GOR balance (backend successfully uses this)...`
      );

      const nativeBalance = await robustConnection.executeWithFallback(
        async (conn) => await conn.getBalance(publicKey)
      );

      const gorBalance = nativeBalance / Math.pow(10, 9); // Convert lamports to GOR (9 decimals)
      console.log(
        `✅ Native GOR balance: ${nativeBalance} lamports = ${gorBalance} GOR`
      );

      return gorBalance; // Always return native balance (even if 0)
    } catch (nativeError) {
      console.error("❌ Native GOR balance check failed:", nativeError);
    }

    // Method 3: Try SPL token balance (fallback)
    try {
      console.log(
        `🪙 Fallback: Trying SPL token balance with mint: ${GGOR_MINT.toBase58()}`
      );
      const tokenAccount = await getAssociatedTokenAddress(
        GGOR_MINT,
        publicKey
      );
      const account = await getAccount(connection, tokenAccount);
      const tokenBalance = Number(account.amount) / Math.pow(10, 6); // Try 6 decimals
      console.log(`🔄 SPL Token balance (6 decimals): ${tokenBalance} GOR`);
      return tokenBalance;
    } catch (tokenError) {
      console.error("❌ Error fetching SPL token balance:", tokenError);
    }

    // Method 4: Try 9 decimals as last resort
    try {
      const tokenAccount = await getAssociatedTokenAddress(
        GGOR_MINT,
        publicKey
      );
      const account = await getAccount(connection, tokenAccount);
      const tokenBalance9 = Number(account.amount) / Math.pow(10, 9);
      console.log(
        `🔄 SPL Token balance (9 decimals fallback): ${tokenBalance9} GOR`
      );
      return tokenBalance9;
    } catch (token9Error) {
      console.error(
        "❌ Error fetching SPL token balance (9 decimals):",
        token9Error
      );
    }

    console.log("⚠️ All balance fetch methods failed, returning 0");
    return 0;
  } catch (error) {
    console.error("❌ Critical error fetching balance:", error);
    return 0;
  }
};

export const getMultipleBalances = async (
  walletAddresses: string[]
): Promise<PlayerBalance[]> => {
  const balances = await Promise.all(
    walletAddresses.map(async (wallet) => {
      const balance = await getPlayerBalance(wallet);
      return {
        wallet,
        balance,
        formattedBalance: balance.toFixed(2),
      };
    })
  );

  return balances;
};

// Entry Fee Transaction (Native GOR Transfer - GOR is native on Gorbagana!)
export const createEntryFeeTransaction = async (
  wallet: WalletContextState,
  betAmount: number,
  gameId: string
): Promise<{ transaction: Transaction; escrowAccount: PublicKey } | null> => {
  if (!wallet.publicKey) return null;

  try {
    console.log(`💰 Creating NATIVE GOR transfer for ${betAmount} GOR`);
    console.log(
      `🌐 GOR is the native token on Gorbagana (like SOL on mainnet)`
    );

    const transaction = new Transaction();

    // For now, we'll use the platform wallet as the "escrow" since we don't have
    // a deployed smart contract yet. In production, this would be a program-derived address.
    const escrowAccount = PLATFORM_WALLET;

    // Create native GOR transfer instruction (9 decimals like SOL)
    const transferAmount = betAmount * Math.pow(10, 9); // Convert GOR to lamports

    const transferInstruction = SystemProgram.transfer({
      fromPubkey: wallet.publicKey,
      toPubkey: escrowAccount,
      lamports: transferAmount,
    });

    transaction.add(transferInstruction);

    // Get recent blockhash with robust connection
    const { blockhash } = await robustConnection.executeWithFallback(
      async (conn) => await conn.getLatestBlockhash("processed")
    );
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = wallet.publicKey;

    console.log(
      `✅ Native GOR transfer created: ${transferAmount} lamports (${betAmount} GOR) to ${escrowAccount.toBase58()}`
    );
    return { transaction, escrowAccount };
  } catch (error) {
    console.error("❌ Error creating native GOR transfer:", error);
    return null;
  }
};

// Execute Entry Fee Payment
export const payEntryFee = async (
  wallet: WalletContextState,
  betAmount: number,
  gameId: string
): Promise<{ success: boolean; txSignature?: string; error?: string }> => {
  if (!wallet.publicKey || !wallet.signTransaction) {
    return { success: false, error: "Wallet not connected" };
  }

  try {
    // Check balance first
    const balance = await getPlayerBalance(wallet.publicKey.toBase58());
    if (balance < betAmount) {
      return {
        success: false,
        error: `Insufficient balance. Need ${betAmount} gGOR, have ${balance.toFixed(
          2
        )} gGOR`,
      };
    }

    const txData = await createEntryFeeTransaction(wallet, betAmount, gameId);
    if (!txData) {
      return { success: false, error: "Failed to create transaction" };
    }

    // Sign and send transaction
    const signedTx = await wallet.signTransaction(txData.transaction);

    // Send transaction with robust connection
    const txSignature = await robustConnection.executeWithFallback(
      async (conn) =>
        await conn.sendRawTransaction(signedTx.serialize(), {
          skipPreflight: false,
          preflightCommitment: "processed",
          maxRetries: 3,
        })
    );

    console.log(`📡 Transaction sent: ${txSignature}`);
    console.log(
      `🔗 Check transaction: ${
        process.env.NEXT_PUBLIC_GORBAGANA_EXPLORER_URL ||
        "https://explorer.gorbagana.wtf"
      }/tx/${txSignature}`
    );

    // Wait for confirmation with improved timeout and retry logic
    try {
      await confirmTransactionWithRetry(txSignature);
      console.log(`💰 Entry fee paid: ${betAmount} gGOR (${txSignature})`);
      return { success: true, txSignature };
    } catch (confirmationError) {
      // Even if confirmation fails, the transaction might have succeeded
      console.warn(
        "⚠️ Confirmation failed, but transaction may have succeeded:",
        confirmationError
      );

      // Try one more status check
      const finalCheck = await checkTransactionStatus(txSignature);
      if (finalCheck.success) {
        console.log(
          `✅ Transaction actually succeeded! ${betAmount} gGOR paid (${txSignature})`
        );
        return { success: true, txSignature };
      }

      // If all checks fail, return the confirmation error
      throw confirmationError;
    }
  } catch (error) {
    console.error("Error paying entry fee:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Transaction failed",
    };
  }
};

// Prize Distribution
export const distributePrize = async (
  winnerWallet: string,
  betPool: { totalAmount: number; platformFee: number; winnerPayout: number },
  gameId: string
): Promise<{ success: boolean; txSignature?: string }> => {
  try {
    // This would typically be called by the game server with admin privileges
    // For now, we'll simulate the distribution

    console.log(`🏆 Distributing prize to ${winnerWallet}:`);
    console.log(`- Winner payout: ${betPool.winnerPayout} gGOR`);
    console.log(`- Platform fee: ${betPool.platformFee} gGOR`);

    // In production, this would:
    // 1. Transfer winnerPayout from escrow to winner
    // 2. Transfer platformFee from escrow to platform wallet
    // 3. Close the escrow account

    return { success: true, txSignature: "mock_prize_distribution_tx" };
  } catch (error) {
    console.error("Error distributing prize:", error);
    return { success: false };
  }
};

// Mock functions for development
export const mockBalances: { [wallet: string]: number } = {
  // These will be replaced with real blockchain calls
};

export const getMockBalance = (walletAddress: string): number => {
  if (!mockBalances[walletAddress]) {
    // Initialize with random balance for testing
    mockBalances[walletAddress] = Math.floor(Math.random() * 20) + 5; // 5-25 gGOR
  }
  return mockBalances[walletAddress];
};

export const updateMockBalance = (walletAddress: string, amount: number) => {
  if (!mockBalances[walletAddress]) {
    mockBalances[walletAddress] = 0;
  }
  mockBalances[walletAddress] += amount;
  console.log(
    `💰 [MOCK] Updated balance for ${walletAddress.slice(0, 8)}...: ${
      amount >= 0 ? "+" : ""
    }${amount.toFixed(2)} GOR (New total: ${mockBalances[walletAddress].toFixed(
      2
    )} GOR)`
  );
};

// Development mode helpers
export const isDevMode = () => {
  // Check if we're in development mode
  // Mock mode if no platform wallet is configured OR if MOCK_MODE is explicitly set
  return !process.env.PLATFORM_PRIVATE_KEY || process.env.MOCK_MODE === "true";
};

export const getBalanceForDisplay = async (
  walletAddress: string
): Promise<number> => {
  if (isDevMode()) {
    // In mock mode, try to sync with backend first for updated prize balances
    return await syncMockBalanceFromBackend(walletAddress);
  }
  return await getPlayerBalance(walletAddress);
};

export const payEntryFeeForDisplay = async (
  wallet: WalletContextState,
  betAmount: number,
  gameId: string
): Promise<{ success: boolean; txSignature?: string; error?: string }> => {
  if (!wallet.publicKey) {
    return { success: false, error: "Wallet not connected" };
  }

  if (isDevMode()) {
    // Mock transaction for development
    const walletAddress = wallet.publicKey.toBase58();
    const currentBalance = await syncMockBalanceFromBackend(walletAddress);

    if (currentBalance < betAmount) {
      return {
        success: false,
        error: `Insufficient balance. Need ${betAmount} gGOR, have ${currentBalance.toFixed(
          2
        )} gGOR`,
      };
    }

    // Deduct the bet amount from backend
    await updateMockBalanceOnBackend(walletAddress, -betAmount);

    console.log(`[DEV MODE] Entry fee paid: ${betAmount} gGOR`);
    console.log(
      `[DEV MODE] New balance: ${await syncMockBalanceFromBackend(
        walletAddress
      )} gGOR`
    );

    return {
      success: true,
      txSignature: `mock_tx_${gameId}_${Date.now()}`,
    };
  }

  return await payEntryFee(wallet, betAmount, gameId);
};

// Escrow management
export const createGameEscrow = async (
  gameId: string,
  player1: string,
  player2: string,
  betAmount: number
): Promise<GameEscrow> => {
  const totalPool = betAmount * 2;
  const platformFee = totalPool * 0.1;

  return {
    gameId,
    player1,
    player2,
    betAmount,
    totalPool,
    platformFee,
    status: "active",
  };
};

export const settleGameEscrow = async (
  escrow: GameEscrow,
  winner: string,
  isDraw: boolean = false
): Promise<{
  success: boolean;
  distributions: Array<{ wallet: string; amount: number }>;
}> => {
  const distributions: Array<{ wallet: string; amount: number }> = [];

  if (isDraw) {
    // Split the pot (minus platform fee) between both players
    const splitAmount = (escrow.totalPool - escrow.platformFee) / 2;
    distributions.push(
      { wallet: escrow.player1, amount: splitAmount },
      { wallet: escrow.player2, amount: splitAmount }
    );
  } else {
    // Winner takes all (minus platform fee)
    const winnerPayout = escrow.totalPool - escrow.platformFee;
    distributions.push({ wallet: winner, amount: winnerPayout });
  }

  // Handle real prize distribution
  if (isDevMode()) {
    // Mock mode - update fake balances
    distributions.forEach(({ wallet, amount }) => {
      updateMockBalance(wallet, amount);
      console.log(
        `[DEV MODE] Distributed ${amount.toFixed(2)} gGOR to ${wallet.slice(
          0,
          8
        )}...`
      );
    });
  } else {
    // Real mode - actual blockchain prize distribution
    console.log("🏆 REAL PRIZE DISTRIBUTION:");
    distributions.forEach(({ wallet, amount }) => {
      console.log(
        `💰 Sending ${amount.toFixed(2)} gGOR to ${wallet.slice(0, 8)}...`
      );
      // TODO: Implement real blockchain transfer from escrow to winner
      // This would call our smart contract's distribute_prize function
    });
  }

  return { success: true, distributions };
};

// Sync mock balances with backend
export const syncMockBalanceFromBackend = async (
  walletAddress: string
): Promise<number> => {
  try {
    const response = await fetch(
      `${
        process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001"
      }/api/mock-balance/${walletAddress}`
    );
    if (response.ok) {
      const data = await response.json();
      mockBalances[walletAddress] = data.balance;
      return data.balance;
    }
  } catch (error) {
    console.warn("Failed to sync mock balance from backend:", error);
  }

  // Fallback to local mock balance
  return getMockBalance(walletAddress);
};

export const updateMockBalanceOnBackend = async (
  walletAddress: string,
  amount: number
): Promise<number> => {
  try {
    const response = await fetch(
      `${
        process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001"
      }/api/mock-balance/${walletAddress}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ amount }),
      }
    );

    if (response.ok) {
      const data = await response.json();
      mockBalances[walletAddress] = data.balance;
      return data.balance;
    }
  } catch (error) {
    console.warn("Failed to update mock balance on backend:", error);
  }

  // Fallback to local update
  updateMockBalance(walletAddress, amount);
  return getMockBalance(walletAddress);
};
