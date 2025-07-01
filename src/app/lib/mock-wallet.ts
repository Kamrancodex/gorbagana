"use client";

// Mock wallet system for users without real wallet connection
// Uses localStorage to persist balance and transaction history

export interface MockWalletState {
  balance: number;
  transactions: MockTransaction[];
  gamesPlayed: number;
  totalWon: number;
  totalLost: number;
}

export interface MockTransaction {
  id: string;
  type: "entry_fee" | "prize" | "initial";
  amount: number;
  gameId?: string;
  timestamp: number;
  description: string;
}

const MOCK_WALLET_KEY = "gorbagana_mock_wallet";
const INITIAL_BALANCE = 10; // 10 GOR starting balance

// Initialize or get existing mock wallet state
export const getMockWalletState = (): MockWalletState => {
  if (typeof window === "undefined") {
    // Server-side rendering fallback
    return {
      balance: INITIAL_BALANCE,
      transactions: [],
      gamesPlayed: 0,
      totalWon: 0,
      totalLost: 0,
    };
  }

  const stored = localStorage.getItem(MOCK_WALLET_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (error) {
      console.warn("Failed to parse mock wallet data, resetting...", error);
    }
  }

  // Create new mock wallet with initial balance
  const initialState: MockWalletState = {
    balance: INITIAL_BALANCE,
    transactions: [
      {
        id: "initial",
        type: "initial",
        amount: INITIAL_BALANCE,
        timestamp: Date.now(),
        description: "Welcome bonus - Free GOR to start playing!",
      },
    ],
    gamesPlayed: 0,
    totalWon: 0,
    totalLost: 0,
  };

  saveMockWalletState(initialState);
  return initialState;
};

// Save mock wallet state to localStorage
export const saveMockWalletState = (state: MockWalletState): void => {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(MOCK_WALLET_KEY, JSON.stringify(state));
  } catch (error) {
    console.error("Failed to save mock wallet state:", error);
  }
};

// Get current mock balance
export const getMockBalance = (): number => {
  const state = getMockWalletState();
  return state.balance;
};

// Update mock balance (for game entry fees, prizes, etc.)
export const updateMockBalance = (
  amount: number,
  transaction: Omit<MockTransaction, "id" | "timestamp">
): boolean => {
  const state = getMockWalletState();

  // Check if user has enough balance for negative amounts (entry fees)
  if (amount < 0 && state.balance + amount < 0) {
    return false; // Insufficient balance
  }

  // Update balance
  state.balance += amount;

  // Add transaction record
  const newTransaction: MockTransaction = {
    ...transaction,
    id: `mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: Date.now(),
  };

  state.transactions.push(newTransaction);

  // Update stats
  if (transaction.type === "entry_fee") {
    state.gamesPlayed++;
    state.totalLost += Math.abs(amount);
  } else if (transaction.type === "prize") {
    state.totalWon += amount;
  }

  saveMockWalletState(state);
  return true;
};

// Pay entry fee from mock wallet
export const payMockEntryFee = (
  betAmount: number,
  gameId: string
): { success: boolean; error?: string } => {
  const success = updateMockBalance(-betAmount, {
    type: "entry_fee",
    amount: -betAmount,
    gameId,
    description: `Entry fee for ${gameId} game`,
  });

  if (!success) {
    return {
      success: false,
      error: `Insufficient balance! You need ${betAmount} GOR but only have ${getMockBalance().toFixed(
        2
      )} GOR.`,
    };
  }

  return { success: true };
};

// Award prize to mock wallet
export const awardMockPrize = (
  prizeAmount: number,
  gameId: string,
  rank: number
): void => {
  updateMockBalance(prizeAmount, {
    type: "prize",
    amount: prizeAmount,
    gameId,
    description: `Prize for finishing rank ${rank} in ${gameId} game`,
  });
};

// Reset mock wallet (for testing or user request)
export const resetMockWallet = (): void => {
  if (typeof window === "undefined") return;

  localStorage.removeItem(MOCK_WALLET_KEY);
  getMockWalletState(); // This will create a fresh wallet
};

// Get mock wallet address (generates a consistent fake address)
export const getMockWalletAddress = (): string => {
  // Generate a consistent mock address based on some browser fingerprint
  const fingerprint =
    typeof window !== "undefined"
      ? `${navigator.userAgent}${screen.width}${screen.height}`
      : "server";

  // Create a proper hash-based address generation
  let hash = 0;
  for (let i = 0; i < fingerprint.length; i++) {
    const char = fingerprint.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }

  // Convert to base58-like string with proper variation
  const chars = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  let result = "";
  let currentHash = Math.abs(hash);

  // Generate a 44-character Solana-like address
  for (let i = 0; i < 44; i++) {
    result += chars[currentHash % chars.length];
    // Vary the hash for each character to avoid repetition
    currentHash = Math.abs((currentHash * 31 + i) % 2147483647);
  }

  return result;
};

// Check if we're in mock wallet mode
export const isMockMode = (): boolean => {
  if (typeof window === "undefined") return false;

  const params = new URLSearchParams(window.location.search);
  return params.has("mock") || window.location.pathname.includes("/mock");
};

// Generate mock transaction signature for consistency
export const generateMockTxSignature = (): string => {
  const chars = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  let result = "";
  for (let i = 0; i < 88; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
};
