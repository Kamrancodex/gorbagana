"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  getMockBalance,
  getMockWalletAddress,
  getMockWalletState,
} from "../lib/mock-wallet";

interface GameCard {
  id: string;
  name: string;
  description: string;
  icon: string;
  minBet: number;
  maxBet: number;
  players: string;
  estimatedTime: string;
  route: string;
}

export default function DemoPage() {
  const router = useRouter();
  const [balance, setBalance] = useState<number>(0);
  const [walletState, setWalletState] = useState({
    gamesPlayed: 0,
    totalWon: 0,
    totalLost: 0,
  });
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);

    const updateWalletState = () => {
      const currentBalance = getMockBalance();
      const state = getMockWalletState();
      setBalance(currentBalance);
      setWalletState({
        gamesPlayed: state.gamesPlayed,
        totalWon: state.totalWon,
        totalLost: state.totalLost,
      });
    };

    updateWalletState();

    // Update every 5 seconds
    const interval = setInterval(updateWalletState, 5000);
    return () => clearInterval(interval);
  }, []);

  const demoGames: GameCard[] = [
    {
      id: "ticTacToe",
      name: "Demo Tic-Tac-Toe",
      description:
        "Classic 3x3 grid game with chess-style timing and betting. Get three in a row to win!",
      icon: "⭕",
      minBet: 0.1,
      maxBet: 100,
      players: "2 Players",
      estimatedTime: "2-5 min",
      route: "/demo/game",
    },
    {
      id: "orbCollector",
      name: "Demo Neon Orb Collector 3D",
      description:
        "Stunning 3D arena! Collect glowing orbs in a futuristic neon environment. Most orbs wins!",
      icon: "🔮",
      minBet: 0.5,
      maxBet: 50,
      players: "2-6 Players",
      estimatedTime: "1-2 min",
      route: "/demo/orb-collector",
    },
    {
      id: "wordGrid",
      name: "Demo Word Grid Battle",
      description:
        "Strategic word building on an 8x8 grid! Take turns placing letters to form valid words. Chess-style timer adds pressure!",
      icon: "🔤",
      minBet: 0.5,
      maxBet: 50,
      players: "2 Players",
      estimatedTime: "5-10 min",
      route: "/demo/word-grid",
    },
  ];

  const handleGameSelect = (game: GameCard) => {
    if (balance < game.minBet) {
      alert(
        `Insufficient demo balance! You need ${
          game.minBet
        } GOR but only have ${balance.toFixed(2)} GOR.`
      );
      return;
    }

    router.push(`${game.route}?bet=1`);
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading demo...</div>
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
              🎭 Demo Gaming Platform
            </h1>
            <div className="text-sm text-orange-400 font-bold flex items-center gap-2 mt-1">
              <span>🎭</span>
              <span>DEMO MODE - No Real Money Required</span>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-white text-right">
              <div className="text-sm text-gray-300">
                {mockAddress.slice(0, 12)}...
              </div>
              <div className="text-lg font-bold text-yellow-400">
                💰 {balance.toFixed(2)} GOR (Demo)
              </div>
            </div>
            <button
              onClick={() => router.push("/")}
              className="bg-green-500 text-white px-3 py-2 rounded-lg font-bold hover:bg-green-400 transition-colors text-sm"
            >
              🔗 Switch to Real Wallet
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

        {/* Demo Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-black/40 backdrop-blur-lg rounded-xl p-6 border border-white/20">
            <div className="text-center">
              <div className="text-3xl mb-3">🎮</div>
              <h3 className="text-xl font-bold text-white mb-2">
                Free to Play
              </h3>
              <p className="text-gray-300 text-sm">
                Start with 10 free demo GOR tokens. No wallet connection
                required!
              </p>
            </div>
          </div>

          <div className="bg-black/40 backdrop-blur-lg rounded-xl p-6 border border-white/20">
            <div className="text-center">
              <div className="text-3xl mb-3">🔒</div>
              <h3 className="text-xl font-bold text-white mb-2">
                Safe Testing
              </h3>
              <p className="text-gray-300 text-sm">
                Test all features without risking real money. Perfect for
                learning!
              </p>
            </div>
          </div>

          <div className="bg-black/40 backdrop-blur-lg rounded-xl p-6 border border-white/20">
            <div className="text-center">
              <div className="text-3xl mb-3">⚡</div>
              <h3 className="text-xl font-bold text-white mb-2">
                Instant Play
              </h3>
              <p className="text-gray-300 text-sm">
                Jump right into games with no setup. Great for quick demos!
              </p>
            </div>
          </div>
        </div>

        {/* Demo Stats Dashboard */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-black/30 backdrop-blur-md rounded-xl p-4 border border-white/10">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-400">
                {balance.toFixed(1)}
              </div>
              <div className="text-sm text-gray-300">Demo GOR Balance</div>
            </div>
          </div>

          <div className="bg-black/30 backdrop-blur-md rounded-xl p-4 border border-white/10">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-400">
                {walletState.gamesPlayed}
              </div>
              <div className="text-sm text-gray-300">Demo Games Played</div>
            </div>
          </div>

          <div className="bg-black/30 backdrop-blur-md rounded-xl p-4 border border-white/10">
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-400">
                {walletState.totalWon.toFixed(1)}
              </div>
              <div className="text-sm text-gray-300">Demo GOR Won</div>
            </div>
          </div>

          <div className="bg-black/30 backdrop-blur-md rounded-xl p-4 border border-white/10">
            <div className="text-center">
              <div className="text-2xl font-bold text-red-400">
                {walletState.totalLost.toFixed(1)}
              </div>
              <div className="text-sm text-gray-300">Demo GOR Spent</div>
            </div>
          </div>
        </div>

        {/* Demo Games Grid */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-white mb-6 text-center">
            🎮 Demo Games Available
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {demoGames.map((game) => (
              <div
                key={game.id}
                className="bg-black/40 backdrop-blur-lg rounded-2xl p-6 border border-white/20 hover:border-yellow-400/50 hover:bg-black/60 transition-all duration-300 cursor-pointer"
                onClick={() => handleGameSelect(game)}
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
                  <div className="bg-green-500 text-white px-3 py-1 rounded-full text-xs font-bold">
                    DEMO
                  </div>
                </div>

                {/* Game Description */}
                <p className="text-gray-300 text-sm mb-4 leading-relaxed">
                  {game.description}
                </p>

                {/* Game Info */}
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Bet Range:</span>
                    <span className="text-white font-medium">
                      {game.minBet}-{game.maxBet} GOR (Demo)
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Game Time:</span>
                    <span className="text-white font-medium">
                      {game.estimatedTime}
                    </span>
                  </div>
                </div>

                {/* Action Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleGameSelect(game);
                  }}
                  disabled={balance < game.minBet}
                  className={`w-full py-3 px-4 rounded-lg font-bold transition-colors ${
                    balance < game.minBet
                      ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                      : "bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-400 hover:to-blue-400 text-white"
                  }`}
                >
                  {balance < game.minBet
                    ? "Insufficient Demo Balance"
                    : `🎮 Play Demo (1 GOR)`}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Demo Instructions */}
        <div className="bg-black/30 backdrop-blur-md rounded-xl p-6 border border-white/10">
          <h3 className="text-xl font-bold text-white mb-4 text-center">
            🎭 How Demo Mode Works
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <span className="text-blue-400 text-xl">1️⃣</span>
                <div>
                  <div className="text-white font-semibold">
                    Choose a Demo Game
                  </div>
                  <div className="text-gray-300 text-sm">
                    Pick any game above to start playing with demo tokens
                  </div>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <span className="text-green-400 text-xl">2️⃣</span>
                <div>
                  <div className="text-white font-semibold">
                    Play with Demo Tokens
                  </div>
                  <div className="text-gray-300 text-sm">
                    Your demo balance is saved in your browser for practice
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <span className="text-yellow-400 text-xl">3️⃣</span>
                <div>
                  <div className="text-white font-semibold">
                    Test All Features
                  </div>
                  <div className="text-gray-300 text-sm">
                    Experience the full game mechanics without real money
                  </div>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <span className="text-purple-400 text-xl">4️⃣</span>
                <div>
                  <div className="text-white font-semibold">
                    Switch to Real Games
                  </div>
                  <div className="text-gray-300 text-sm">
                    When ready, connect your wallet for real GOR games!
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
