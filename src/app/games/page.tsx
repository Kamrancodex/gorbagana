"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getBalanceForDisplay, PlayerBalance } from "../lib/blockchain";

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

export default function GamesPage() {
  const { publicKey, connected } = useWallet();
  const router = useRouter();
  const [selectedGame, setSelectedGame] = useState<string | null>(null);
  const [betAmount, setBetAmount] = useState<number>(1);
  const [myBalance, setMyBalance] = useState<number>(0);

  useEffect(() => {
    if (!connected) {
      router.push("/");
    }
  }, [connected, router]);

  // Load player balance
  useEffect(() => {
    const loadBalance = async () => {
      if (publicKey) {
        const balance = await getBalanceForDisplay(publicKey.toBase58());
        setMyBalance(balance);
      }
    };

    loadBalance();

    // Refresh balance every 15 seconds
    const interval = setInterval(loadBalance, 15000);
    return () => clearInterval(interval);
  }, [publicKey]);

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
        `Insufficient balance! You need ${betAmount} gGOR but only have ${myBalance.toFixed(
          2
        )} gGOR.`
      );
      return;
    }

    if (gameId === "orbCollector") {
      router.push(`/orb-collector?bet=${betAmount}`);
    } else if (gameId === "ticTacToe") {
      router.push(`/game?bet=${betAmount}`);
    } else {
      alert("This game is coming soon!");
    }
  };

  const handleQuickPlay = (gameId: string) => {
    if (myBalance < 1) {
      alert(
        `Insufficient balance! You need 1 gGOR but only have ${myBalance.toFixed(
          2
        )} gGOR.`
      );
      return;
    }

    setSelectedGame(gameId);
    setBetAmount(1); // Default bet
    if (gameId === "orbCollector") {
      router.push(`/orb-collector?bet=1`);
    } else if (gameId === "ticTacToe") {
      router.push(`/game?bet=1`);
    }
  };

  if (!connected) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">
          Redirecting to wallet connection...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-pink-900">
      {/* Header */}
      <div className="p-6 bg-black/50">
        <div className="flex justify-between items-center max-w-6xl mx-auto">
          <h1 className="text-4xl font-bold text-white">🎮 Gaming Platform</h1>
          <div className="flex items-center space-x-4">
            <div className="text-white text-right">
              <div className="text-sm text-gray-300">
                {publicKey?.toBase58().slice(0, 8)}...
              </div>
              <div className="text-lg font-bold text-yellow-400">
                💰 {myBalance.toFixed(2)} gGOR
              </div>
            </div>
            <button
              onClick={() => router.push("/balance-check")}
              className="bg-purple-500 text-white px-3 py-2 rounded-lg font-bold hover:bg-purple-400 transition-colors text-sm"
            >
              💰 Check Balance
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

      <div className="max-w-6xl mx-auto p-6">
        {/* Mode Alert */}
        <div className="mb-6 bg-green-500/20 p-4 rounded-xl border border-green-500">
          <div className="text-center">
            <div className="text-green-400 font-bold text-lg mb-2">
              🔗 REAL BLOCKCHAIN MODE ACTIVE
            </div>
            <div className="text-white text-sm">
              Your balance ({myBalance.toFixed(2)} gGOR) is from your actual
              testnet wallet. Entry fees will be deducted but{" "}
              <strong className="text-yellow-400">
                winnings are not yet distributed back
              </strong>
              .
              <button
                onClick={() => router.push("/balance-check")}
                className="ml-2 text-blue-400 hover:text-blue-300 underline"
              >
                Learn more →
              </button>
            </div>
          </div>
        </div>

        {/* Platform Stats */}
        <div className="mb-8 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-black/70 p-4 rounded-xl text-center">
            <div className="text-2xl font-bold text-green-400">1,247</div>
            <div className="text-gray-300">Total Games</div>
          </div>
          <div className="bg-black/70 p-4 rounded-xl text-center">
            <div className="text-2xl font-bold text-blue-400">3</div>
            <div className="text-gray-300">Active Rooms</div>
          </div>
          <div className="bg-black/70 p-4 rounded-xl text-center">
            <div className="text-2xl font-bold text-purple-400">2,156.8</div>
            <div className="text-gray-300">gGOR Volume</div>
          </div>
          <div className="bg-black/70 p-4 rounded-xl text-center">
            <div className="text-2xl font-bold text-yellow-400">215.7</div>
            <div className="text-gray-300">Platform Fees</div>
          </div>
        </div>

        {/* Game Selection */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-white mb-6 text-center">
            Choose Your Game
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {availableGames.map((game) => (
              <div
                key={game.id}
                className={`bg-black/70 p-6 rounded-2xl border-2 transition-all duration-300 ${
                  game.available
                    ? "border-gray-600 hover:border-blue-500 cursor-pointer hover:scale-105"
                    : "border-gray-800 opacity-50 cursor-not-allowed"
                }`}
                onClick={() => game.available && setSelectedGame(game.id)}
              >
                <div className="text-center mb-4">
                  <div className="text-6xl mb-2">{game.icon}</div>
                  <h3 className="text-2xl font-bold text-white mb-2">
                    {game.name}
                  </h3>
                  <p className="text-gray-300 text-sm">{game.description}</p>
                </div>

                <div className="space-y-3 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Players:</span>
                    <span className="text-white">{game.players}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Est. Time:</span>
                    <span className="text-white">{game.estimatedTime}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Bet Range:</span>
                    <span className="text-white">
                      {game.minBet} - {game.maxBet} gGOR
                    </span>
                  </div>
                </div>

                {/* Game Stats */}
                <div className="bg-gray-800/50 p-3 rounded-lg mb-4">
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="text-center">
                      <div className="text-green-400 font-bold">
                        {game.stats.totalGames}
                      </div>
                      <div className="text-gray-400">Games</div>
                    </div>
                    <div className="text-center">
                      <div className="text-blue-400 font-bold">
                        {game.stats.activeRooms}
                      </div>
                      <div className="text-gray-400">Active</div>
                    </div>
                    <div className="text-center">
                      <div className="text-purple-400 font-bold">
                        {game.stats.totalVolume}
                      </div>
                      <div className="text-gray-400">Volume</div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                {game.available ? (
                  <div className="space-y-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleQuickPlay(game.id);
                      }}
                      className="w-full bg-green-500 text-white py-2 rounded-lg font-bold hover:bg-green-400 transition-colors"
                    >
                      ⚡ Quick Play (1 gGOR)
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedGame(game.id);
                      }}
                      className="w-full bg-blue-500 text-white py-2 rounded-lg font-bold hover:bg-blue-400 transition-colors"
                    >
                      🎯 Custom Bet
                    </button>
                  </div>
                ) : (
                  <div className="text-center">
                    <div className="bg-gray-600 text-gray-300 py-2 rounded-lg font-bold">
                      🚧 Coming Soon
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Custom Bet Modal */}
        {selectedGame && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
            <div className="bg-gray-900 p-8 rounded-2xl border-2 border-blue-500 max-w-md w-full mx-4">
              <h3 className="text-2xl font-bold text-white mb-4 text-center">
                {availableGames.find((g) => g.id === selectedGame)?.icon}{" "}
                {availableGames.find((g) => g.id === selectedGame)?.name}
              </h3>

              <div className="mb-6">
                <label className="block text-white mb-2">
                  Bet Amount (gGOR):
                </label>
                <input
                  type="number"
                  value={betAmount}
                  onChange={(e) => setBetAmount(Number(e.target.value))}
                  min={
                    availableGames.find((g) => g.id === selectedGame)?.minBet
                  }
                  max={
                    availableGames.find((g) => g.id === selectedGame)?.maxBet
                  }
                  step="0.1"
                  className="w-full p-3 bg-gray-800 text-white rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>
                    Min:{" "}
                    {availableGames.find((g) => g.id === selectedGame)?.minBet}{" "}
                    gGOR
                  </span>
                  <span>
                    Max:{" "}
                    {availableGames.find((g) => g.id === selectedGame)?.maxBet}{" "}
                    gGOR
                  </span>
                </div>
              </div>

              <div className="mb-6 bg-gray-800/50 p-4 rounded-lg">
                <div className="text-sm text-gray-300 space-y-1">
                  <div className="flex justify-between">
                    <span>Your Bet:</span>
                    <span className="text-white">{betAmount} gGOR</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Platform Fee (10%):</span>
                    <span className="text-red-400">
                      {(betAmount * 2 * 0.1).toFixed(2)} gGOR
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-gray-600 pt-1">
                    <span className="font-bold">Winner Takes:</span>
                    <span className="text-green-400 font-bold">
                      {(betAmount * 2 * 0.9).toFixed(2)} gGOR
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => setSelectedGame(null)}
                  className="flex-1 bg-gray-600 text-white py-3 rounded-lg font-bold hover:bg-gray-500 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleGameSelect(selectedGame)}
                  className="flex-1 bg-blue-500 text-white py-3 rounded-lg font-bold hover:bg-blue-400 transition-colors"
                >
                  🎮 Start Game
                </button>
              </div>
            </div>
          </div>
        )}

        {/* How Platform Works */}
        <div className="bg-black/50 p-6 rounded-xl">
          <h3 className="text-xl font-bold text-white mb-4 text-center">
            🎯 How It Works
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
            <div className="p-4">
              <div className="text-3xl mb-2">💰</div>
              <div className="text-white font-bold mb-1">1. Place Bet</div>
              <div className="text-gray-300 text-sm">
                Choose your game and bet amount
              </div>
            </div>
            <div className="p-4">
              <div className="text-3xl mb-2">👥</div>
              <div className="text-white font-bold mb-1">2. Find Match</div>
              <div className="text-gray-300 text-sm">
                Get matched with another player
              </div>
            </div>
            <div className="p-4">
              <div className="text-3xl mb-2">🎮</div>
              <div className="text-white font-bold mb-1">3. Play Game</div>
              <div className="text-gray-300 text-sm">
                Compete in real-time gameplay
              </div>
            </div>
            <div className="p-4">
              <div className="text-3xl mb-2">🏆</div>
              <div className="text-white font-bold mb-1">4. Win Prize</div>
              <div className="text-gray-300 text-sm">
                Winner takes 90% of the pot
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
