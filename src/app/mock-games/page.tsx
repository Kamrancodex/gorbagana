"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  getMockBalance,
  getMockWalletState,
  getMockWalletAddress,
  payMockEntryFee,
} from "../lib/mock-wallet";

interface GameStats {
  totalGames: number;
  activeRooms: number;
  totalVolume: number;
}

interface Game {
  id: string;
  name: string;
  description: string;
  icon: string;
  minBet: number;
  maxBet: number;
  players: string;
  estimatedTime: string;
  stats: GameStats;
  available: boolean;
}

export default function MockGamesPage() {
  const router = useRouter();
  const [selectedGame, setSelectedGame] = useState<string | null>(null);
  const [betAmount, setBetAmount] = useState<number>(1);
  const [myBalance, setMyBalance] = useState<number>(0);
  const [walletState, setWalletState] = useState(getMockWalletState());
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Load and refresh mock balance
  useEffect(() => {
    const updateWalletState = () => {
      const state = getMockWalletState();
      setWalletState(state);
      setMyBalance(state.balance);
    };

    updateWalletState();

    // Refresh balance every 5 seconds to catch any changes
    const interval = setInterval(updateWalletState, 5000);
    return () => clearInterval(interval);
  }, []);

  const availableGames: Game[] = [
    {
      id: "orbCollector",
      name: "Neon Orb Collector 3D",
      description:
        "Stunning 3D arena! Collect glowing orbs in a neon battlefield. WASD movement, real-time multiplayer!",
      icon: "🔮",
      minBet: 0.5,
      maxBet: 50,
      players: "2-6 Players",
      estimatedTime: "60 seconds",
      stats: {
        totalGames: 0,
        activeRooms: 0,
        totalVolume: 0,
      },
      available: true,
    },
    {
      id: "ticTacToe",
      name: "Tic-Tac-Toe",
      description: "Classic 3x3 grid game. Get three in a row to win!",
      icon: "⭕",
      minBet: 0.1,
      maxBet: 100,
      players: "2 Players",
      estimatedTime: "2-5 min",
      stats: {
        totalGames: 1247,
        activeRooms: 3,
        totalVolume: 2156.8,
      },
      available: true,
    },
    {
      id: "connect4",
      name: "Connect Four",
      description:
        "Drop checkers to get four in a row vertically, horizontally, or diagonally.",
      icon: "🔴",
      minBet: 0.5,
      maxBet: 50,
      players: "2 Players",
      estimatedTime: "5-10 min",
      stats: {
        totalGames: 0,
        activeRooms: 0,
        totalVolume: 0,
      },
      available: false,
    },
    {
      id: "checkers",
      name: "Checkers",
      description: "Strategic board game where you capture opponent's pieces.",
      icon: "⚫",
      minBet: 1,
      maxBet: 200,
      players: "2 Players",
      estimatedTime: "10-30 min",
      stats: {
        totalGames: 0,
        activeRooms: 0,
        totalVolume: 0,
      },
      available: false,
    },
  ];

  const handleGameSelect = (gameId: string) => {
    if (myBalance < betAmount) {
      alert(
        `Insufficient balance! You need ${betAmount} GOR but only have ${myBalance.toFixed(
          2
        )} GOR.`
      );
      return;
    }

    if (gameId === "orbCollector") {
      router.push(`/orb-collector?bet=${betAmount}&mock=true`);
    } else if (gameId === "ticTacToe") {
      router.push(`/game?bet=${betAmount}&mock=true`);
    } else {
      alert("This game is coming soon!");
    }
  };

  const handleQuickPlay = (gameId: string) => {
    if (myBalance < 1) {
      alert(
        `Insufficient balance! You need 1 GOR but only have ${myBalance.toFixed(
          2
        )} GOR.`
      );
      return;
    }

    setSelectedGame(gameId);
    setBetAmount(1); // Default bet
    if (gameId === "orbCollector") {
      router.push(`/orb-collector?bet=1&mock=true`);
    } else if (gameId === "ticTacToe") {
      router.push(`/game?bet=1&mock=true`);
    }
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  const mockAddress = getMockWalletAddress();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-pink-900">
      {/* Header */}
      <div className="p-6 bg-black/50">
        <div className="flex justify-between items-center max-w-6xl mx-auto">
          <div>
            <h1 className="text-4xl font-bold text-white">
              🎮 Gaming Platform
            </h1>
            <div className="text-sm text-orange-400 font-bold flex items-center gap-2 mt-1">
              <span>🎭</span>
              <span>DEMO MODE - No Real Money</span>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-white text-right">
              <div className="text-sm text-gray-300">
                {mockAddress.slice(0, 8)}...
              </div>
              <div className="text-lg font-bold text-yellow-400">
                💰 {myBalance.toFixed(2)} GOR (Demo)
              </div>
            </div>
            <button
              onClick={() => router.push("/")}
              className="bg-green-500 text-white px-3 py-2 rounded-lg font-bold hover:bg-green-400 transition-colors text-sm"
            >
              🔗 Connect Real Wallet
            </button>
            <button
              onClick={() => router.push("/leaderboard")}
              className="bg-yellow-500 text-black px-4 py-2 rounded-lg font-bold hover:bg-yellow-400 transition-colors"
            >
              🏆 Leaderboard
            </button>
          </div>
        </div>
      </div>

      {/* Demo Mode Notice */}
      <div className="max-w-6xl mx-auto p-6">
        <div className="bg-orange-500/20 border border-orange-500/50 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🎭</span>
            <div>
              <h3 className="text-orange-400 font-bold text-lg">
                Demo Mode Active
              </h3>
              <p className="text-orange-200 text-sm">
                You're playing with virtual GOR tokens stored in your browser.
                Games played: {walletState.gamesPlayed} | Won:{" "}
                {walletState.totalWon.toFixed(2)} GOR | Lost:{" "}
                {walletState.totalLost.toFixed(2)} GOR
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Games Grid */}
      <div className="max-w-6xl mx-auto p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
          {availableGames.map((game) => (
            <div
              key={game.id}
              className={`bg-black/40 backdrop-blur-lg rounded-2xl p-6 border transition-all duration-300 ${
                game.available
                  ? "border-white/20 hover:border-yellow-400/50 hover:bg-black/60"
                  : "border-gray-500/20 opacity-60"
              }`}
            >
              {/* Game Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <span className="text-4xl">{game.icon}</span>
                  <div>
                    <h3 className="text-xl font-bold text-white">
                      {game.name}
                    </h3>
                    <p className="text-gray-400 text-sm">{game.players}</p>
                  </div>
                </div>
                {!game.available && (
                  <span className="bg-gray-600 text-gray-300 px-3 py-1 rounded-full text-xs">
                    Coming Soon
                  </span>
                )}
              </div>

              {/* Game Description */}
              <p className="text-gray-300 text-sm mb-4">{game.description}</p>

              {/* Game Stats */}
              <div className="grid grid-cols-3 gap-4 mb-4 text-center">
                <div>
                  <div className="text-yellow-400 font-bold text-lg">
                    {game.stats.totalGames}
                  </div>
                  <div className="text-gray-400 text-xs">Games</div>
                </div>
                <div>
                  <div className="text-green-400 font-bold text-lg">
                    {game.stats.activeRooms}
                  </div>
                  <div className="text-gray-400 text-xs">Active</div>
                </div>
                <div>
                  <div className="text-blue-400 font-bold text-lg">
                    {game.stats.totalVolume.toFixed(1)}K
                  </div>
                  <div className="text-gray-400 text-xs">Volume</div>
                </div>
              </div>

              {/* Betting Controls */}
              {game.available && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300 text-sm">Bet Amount:</span>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() =>
                          setBetAmount(Math.max(game.minBet, betAmount - 0.5))
                        }
                        className="bg-gray-600 text-white w-8 h-8 rounded-lg hover:bg-gray-500"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        value={betAmount}
                        onChange={(e) =>
                          setBetAmount(
                            Math.max(
                              game.minBet,
                              Math.min(
                                game.maxBet,
                                parseFloat(e.target.value) || 0
                              )
                            )
                          )
                        }
                        min={game.minBet}
                        max={game.maxBet}
                        step="0.1"
                        className="w-20 bg-gray-700 text-white text-center rounded-lg px-2 py-1"
                      />
                      <button
                        onClick={() =>
                          setBetAmount(Math.min(game.maxBet, betAmount + 0.5))
                        }
                        className="bg-gray-600 text-white w-8 h-8 rounded-lg hover:bg-gray-500"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleQuickPlay(game.id)}
                      className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-500 transition-colors font-semibold"
                    >
                      Quick Play (1 GOR)
                    </button>
                    <button
                      onClick={() => handleGameSelect(game.id)}
                      className="flex-1 bg-yellow-600 text-white py-2 px-4 rounded-lg hover:bg-yellow-500 transition-colors font-semibold"
                    >
                      Play ({betAmount} GOR)
                    </button>
                  </div>
                </div>
              )}

              {!game.available && (
                <div className="text-center">
                  <button
                    disabled
                    className="w-full bg-gray-600 text-gray-400 py-2 px-4 rounded-lg cursor-not-allowed"
                  >
                    Coming Soon
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Stats and Info */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-black/40 backdrop-blur-lg rounded-xl p-6 border border-white/20">
            <h3 className="text-xl font-bold text-yellow-400 mb-3">
              💰 Your Demo Stats
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-300">Current Balance:</span>
                <span className="text-yellow-400 font-bold">
                  {myBalance.toFixed(2)} GOR
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Games Played:</span>
                <span className="text-white">{walletState.gamesPlayed}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Total Won:</span>
                <span className="text-green-400">
                  {walletState.totalWon.toFixed(2)} GOR
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Total Lost:</span>
                <span className="text-red-400">
                  {walletState.totalLost.toFixed(2)} GOR
                </span>
              </div>
            </div>
          </div>

          <div className="bg-black/40 backdrop-blur-lg rounded-xl p-6 border border-white/20">
            <h3 className="text-xl font-bold text-blue-400 mb-3">
              ℹ️ Demo Info
            </h3>
            <div className="text-sm text-gray-300 space-y-2">
              <p>• Virtual 10 GOR starting balance</p>
              <p>• All progress saved in browser</p>
              <p>• No real money involved</p>
              <p>• Experience the full game mechanics</p>
            </div>
          </div>

          <div className="bg-black/40 backdrop-blur-lg rounded-xl p-6 border border-white/20">
            <h3 className="text-xl font-bold text-green-400 mb-3">
              🚀 Ready for Real Play?
            </h3>
            <div className="text-sm text-gray-300 mb-4">
              Connect your Backpack wallet to play with real GOR tokens and earn
              actual rewards!
            </div>
            <button
              onClick={() => router.push("/")}
              className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-500 transition-colors font-semibold"
            >
              Connect Real Wallet
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
