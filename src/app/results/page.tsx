"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useGameWebSocket } from "../lib/websocket";
import {
  getBalanceForDisplay,
  syncMockBalanceFromBackend,
  isDevMode,
} from "../lib/blockchain";

interface GameResult {
  position: number;
  tokens: number;
  reward: number;
  isWinner: boolean;
}

export default function ResultsPage() {
  const { publicKey, connected } = useWallet();
  const router = useRouter();
  const { gameState } = useGameWebSocket();
  const [gameResult, setGameResult] = useState<GameResult | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [results, setResults] = useState<GameResult[]>([]);
  const [playerBalance, setPlayerBalance] = useState<number | null>(null);
  const [isRefreshingBalance, setIsRefreshingBalance] = useState(false);
  const [gameType, setGameType] = useState<string>("");

  useEffect(() => {
    if (!connected) {
      router.push("/");
      return;
    }

    if (gameState && gameState.gameStatus === "finished") {
      const playerData = gameState.players.find((p) => p.isYou);
      if (playerData) {
        const sortedPlayers = [...gameState.players].sort(
          (a, b) => b.tokens - a.tokens
        );
        const position =
          sortedPlayers.findIndex((p) => p.id === playerData.id) + 1;

        // Calculate rewards (mock calculation)
        const totalPool = gameState.players.length * 5; // 5 gGOR entry fee each
        let reward = 0;
        let isWinner = false;

        if (position === 1) {
          reward = Math.floor(totalPool * 0.5);
          isWinner = true;
        } else if (position === 2) {
          reward = Math.floor(totalPool * 0.3);
          isWinner = true;
        } else if (position === 3) {
          reward = Math.floor(totalPool * 0.2);
          isWinner = true;
        }

        setGameResult({
          position,
          tokens: playerData.tokens,
          reward,
          isWinner,
        });

        if (isWinner) {
          setShowConfetti(true);
          setTimeout(() => setShowConfetti(false), 5000);
        }
      }
    }

    // Get results from localStorage
    const savedResults = localStorage.getItem("gameResults");
    const savedGameType = localStorage.getItem("lastGameType");

    if (savedResults) {
      setResults(JSON.parse(savedResults));
    }

    if (savedGameType) {
      setGameType(savedGameType);
    }

    // Load initial balance
    if (publicKey) {
      loadBalance();
    }
  }, [connected, gameState, router, publicKey]);

  const loadBalance = async () => {
    if (!publicKey) return;

    try {
      const balance = await getBalanceForDisplay(publicKey.toBase58());
      setPlayerBalance(balance);
    } catch (error) {
      console.error("Error loading balance:", error);
    }
  };

  const refreshBalance = async () => {
    if (!publicKey) return;

    setIsRefreshingBalance(true);
    try {
      let balance;
      if (isDevMode()) {
        // Force sync with backend for updated prize balances
        balance = await syncMockBalanceFromBackend(publicKey.toBase58());
      } else {
        balance = await getBalanceForDisplay(publicKey.toBase58());
      }
      setPlayerBalance(balance);
    } catch (error) {
      console.error("Error refreshing balance:", error);
    } finally {
      setIsRefreshingBalance(false);
    }
  };

  const handlePlayAgain = () => {
    router.push("/lobby");
  };

  const handleGoHome = () => {
    router.push("/");
  };

  if (!connected || !gameResult) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading results...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-white mb-4">
            🎯 Game Results
          </h1>
          <p className="text-xl text-gray-300">
            {gameType === "orbCollector"
              ? "Orb Collector Championship"
              : "Game Championship"}
          </p>
        </div>

        {/* Player Balance Card */}
        {publicKey && (
          <div className="bg-black/30 backdrop-blur-md rounded-xl p-6 mb-8 border border-white/10">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">
                  Your Balance
                </h3>
                <div className="flex items-center gap-4">
                  <span className="text-3xl font-bold text-green-400">
                    {playerBalance !== null
                      ? `${playerBalance.toFixed(2)} GOR`
                      : "Loading..."}
                  </span>
                  {isDevMode() && (
                    <span className="px-2 py-1 bg-orange-500/20 text-orange-300 rounded text-sm">
                      MOCK MODE
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={refreshBalance}
                disabled={isRefreshingBalance}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:opacity-50 text-white rounded-lg transition-colors flex items-center gap-2"
              >
                {isRefreshingBalance ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Refreshing...
                  </>
                ) : (
                  <>🔄 Refresh Balance</>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Player Result Card */}
        {gameResult && (
          <div className="bg-black/30 backdrop-blur-md rounded-xl p-6 mb-8 border border-white/10">
            <div className="text-center">
              <div className="text-6xl mb-4">
                {gameResult.isWinner ? "🏆" : "🎮"}
              </div>
              <h2
                className={`text-3xl font-bold mb-2 ${
                  gameResult.isWinner ? "text-yellow-400" : "text-gray-300"
                }`}
              >
                {gameResult.isWinner ? "🏆 WINNER! 🏆" : "Game Complete"}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                <div className="bg-white/5 rounded-lg p-4">
                  <div className="text-gray-400 text-sm">Final Position</div>
                  <div
                    className={`text-2xl font-bold ${
                      gameResult.isWinner ? "text-yellow-400" : "text-gray-400"
                    }`}
                  >
                    #{gameResult.position}
                  </div>
                </div>
                <div className="bg-white/5 rounded-lg p-4">
                  <div className="text-gray-400 text-sm">Tokens Collected</div>
                  <div
                    className={`text-2xl font-bold ${
                      gameResult.isWinner ? "text-green-400" : "text-gray-400"
                    }`}
                  >
                    {gameResult.tokens} gGOR
                  </div>
                </div>
                <div className="bg-white/5 rounded-lg p-4">
                  <div className="text-gray-400 text-sm">Reward Earned</div>
                  <div
                    className={`text-2xl font-bold ${
                      gameResult.isWinner ? "text-pink-400" : "text-gray-400"
                    }`}
                  >
                    {gameResult.reward > 0
                      ? `${gameResult.reward} gGOR`
                      : "None"}
                  </div>
                </div>
              </div>
              {gameResult.isWinner && (
                <div className="mt-4 p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                  <p className="text-green-300 font-semibold">
                    🎉 Congratulations! Your prize of {gameResult.reward} gGOR
                    has been added to your balance!
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Leaderboard */}
        <div className="bg-black/30 backdrop-blur-md rounded-xl p-6 mb-8 border border-white/10">
          <h3 className="text-2xl font-bold text-white mb-6 text-center">
            🏆 Final Leaderboard
          </h3>
          <div className="space-y-3">
            {gameState?.players
              .sort((a, b) => b.tokens - a.tokens)
              .map((player, index) => (
                <div
                  key={player.id}
                  className={`flex items-center justify-between p-4 rounded-lg ${
                    player.isYou
                      ? "bg-blue-500/20 border border-blue-500/50"
                      : "bg-white/5"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className="text-2xl">
                      {index === 0
                        ? "🥇"
                        : index === 1
                        ? "🥈"
                        : index === 2
                        ? "🥉"
                        : `#${index + 1}`}
                    </div>
                    <div>
                      <div
                        className={`font-bold ${
                          player.isYou ? "text-blue-400" : "text-gray-400"
                        }`}
                      >
                        {player.isYou ? "You" : `Player ${index + 1}`}
                      </div>
                      <div className="text-sm text-gray-400">
                        {player.isYou
                          ? publicKey?.toBase58().slice(0, 8) +
                            "..." +
                            publicKey?.toBase58().slice(-4)
                          : ""}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-white">
                      {player.tokens} gGOR
                    </div>
                    {index < 3 && (
                      <div className="text-sm text-green-400">
                        +{index === 0 ? "50%" : index === 1 ? "30%" : "20%"}{" "}
                        pool
                      </div>
                    )}
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={handlePlayAgain}
            className="px-8 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg transition-colors"
          >
            🎮 Play Again
          </button>
          <button
            onClick={() => router.push("/leaderboard")}
            className="px-8 py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg transition-colors"
          >
            📊 View Leaderboard
          </button>
          <button
            onClick={handleGoHome}
            className="px-8 py-3 bg-gray-600 hover:bg-gray-700 text-white font-bold rounded-lg transition-colors"
          >
            🏠 Home
          </button>
        </div>

        {/* Wallet Info */}
        <div className="mt-12 text-sm text-gray-400">
          <p>
            Connected: {publicKey?.toBase58().slice(0, 8)}...
            {publicKey?.toBase58().slice(-4)}
          </p>
          {gameResult.reward > 0 && (
            <p className="mt-2 text-green-400">
              Rewards will be automatically transferred to your wallet
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
