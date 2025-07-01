"use client";

import { PublicKey } from "@solana/web3.js";
import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react";
import { useMemo } from "react";

// Program ID for Token Takedown Royale (DEPLOYED CONTRACT)
export const PROGRAM_ID = new PublicKey("11111111111111111111111111111112");

// GOR token mint address (official from Jupiter)
export const GGOR_MINT = new PublicKey("11111111111111111111111111111113");

export function useAnchorProgram() {
  const { connection } = useConnection();
  const wallet = useAnchorWallet();

  const program = useMemo(() => {
    if (!wallet) return null;

    // For development - return a mock program object
    return {
      programId: PROGRAM_ID,
      provider: {
        connection,
        wallet,
      },
    };
  }, [connection, wallet]);

  return program;
}

// Utility functions for PDA derivation (simplified for development)
export function getGamePDA(gameId: number): [PublicKey, number] {
  // For development - return a deterministic address
  const seeds = `game_${gameId}`;
  const hash = Array.from(seeds).reduce((a, b) => {
    a = (a << 5) - a + b.charCodeAt(0);
    return a & a;
  }, 0);

  // Create a deterministic public key for development
  const bytes = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    bytes[i] = (hash + i) % 256;
  }

  return [new PublicKey(bytes), 255];
}

export function getGameVaultPDA(gameId: number): [PublicKey, number] {
  // For development - return a deterministic address
  const seeds = `game_vault_${gameId}`;
  const hash = Array.from(seeds).reduce((a, b) => {
    a = (a << 5) - a + b.charCodeAt(0);
    return a & a;
  }, 0);

  // Create a deterministic public key for development
  const bytes = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    bytes[i] = (hash + i + 100) % 256;
  }

  return [new PublicKey(bytes), 254];
}

// Simplified blockchain interaction functions for development
export class GameContract {
  constructor(private program: any) {}

  async initializeGame(gameId: number, entryFee: number, maxPlayers: number) {
    console.log("🎮 [DEV MODE] Initializing game:", {
      gameId,
      entryFee,
      maxPlayers,
    });

    // Simulate transaction
    await new Promise((resolve) => setTimeout(resolve, 1000));

    return {
      signature: `mock_init_${gameId}_${Date.now()}`,
      success: true,
    };
  }

  async joinGame(gameId: number) {
    console.log("👤 [DEV MODE] Joining game:", gameId);

    // Simulate transaction
    await new Promise((resolve) => setTimeout(resolve, 800));

    return {
      signature: `mock_join_${gameId}_${Date.now()}`,
      success: true,
    };
  }

  async usePowerUp(gameId: number, powerUpType: "FreezeRay") {
    console.log("⚡ [DEV MODE] Using power-up:", { gameId, powerUpType });

    // Simulate token burn transaction
    await new Promise((resolve) => setTimeout(resolve, 600));

    return {
      signature: `mock_powerup_${gameId}_${Date.now()}`,
      success: true,
    };
  }

  async getGameState(gameId: number) {
    console.log("📊 [DEV MODE] Getting game state:", gameId);

    // Return mock game state
    return {
      gameId,
      entryFee: 5000000, // 5 GOR in lamports
      maxPlayers: 6,
      currentPlayers: 2,
      status: "waiting",
      totalPool: 10000000, // 10 GOR
      players: [],
      winners: [],
      finalScores: [],
    };
  }

  async distributeRewards(
    gameId: number,
    winners: PublicKey[],
    finalScores: number[]
  ) {
    console.log("🏆 [DEV MODE] Distributing rewards:", {
      gameId,
      winners: winners.length,
      finalScores,
    });

    // Simulate reward distribution
    await new Promise((resolve) => setTimeout(resolve, 1200));

    return {
      signature: `mock_rewards_${gameId}_${Date.now()}`,
      success: true,
    };
  }
}

export function useGameContract() {
  const program = useAnchorProgram();

  const gameContract = useMemo(() => {
    if (!program) return null;
    return new GameContract(program);
  }, [program]);

  return gameContract;
}
