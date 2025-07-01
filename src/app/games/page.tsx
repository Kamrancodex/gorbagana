"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

// Dynamically import wallet components to prevent hydration errors
const WalletButton = dynamic(() => import("../components/WalletButton"), {
  ssr: false,
});

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

export default function RealWalletGamesPage() {
  const { connected, publicKey } = useWallet();
  const router = useRouter();
  const [balance, setBalance] = useState<number>(0);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch real GOR balance when wallet connects
  useEffect(() => {
    if (connected && publicKey && mounted) {
      fetchRealBalance();
    }
  }, [connected, publicKey, mounted]);

  const fetchRealBalance = async () => {
    if (!publicKey) return;

    setBalanceLoading(true);
    try {
      const backendUrl =
        process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";
      const response = await fetch(
        `${backendUrl}/api/real-balance/${publicKey.toBase58()}`
      );
      const data = await response.json();

      if (data.success) {
        setBalance(data.balance);
        console.log(`✅ Real GOR balance: ${data.balance}`);
      } else {
        console.error("❌ Failed to fetch balance:", data.error);
        setBalance(0);
      }
    } catch (error) {
      console.error("❌ Balance fetch error:", error);
      setBalance(0);
    } finally {
      setBalanceLoading(false);
    }
  };

  const realWalletGames: GameCard[] = [
    {
      id: "ticTacToe",
      name: "Real Tic-Tac-Toe",
      description:
        "Classic 3x3 grid game with real GOR betting. Winner takes 90% of the pot!",
      icon: "⭕",
      minBet: 0.1,
      maxBet: 100,
      players: "2 Players",
      estimatedTime: "2-5 min",
      route: "/game",
    },
    {
      id: "orbCollector",
      name: "Real Neon Orb Collector 3D",
      description:
        "Stunning 3D arena with real GOR prizes! Collect glowing orbs to win actual cryptocurrency.",
      icon: "🔮",
      minBet: 0.5,
      maxBet: 50,
      players: "2-6 Players",
      estimatedTime: "1-2 min",
      route: "/orb-collector",
    },
    {
      id: "wordGrid",
      name: "Real Word Grid Battle",
      description:
        "Strategic word building with real GOR stakes! Form words on 8x8 grid to win cryptocurrency.",
      icon: "🔤",
      minBet: 0.5,
      maxBet: 50,
      players: "2 Players",
      estimatedTime: "5-10 min",
      route: "/word-grid",
    },
  ];

  const handleGameSelect = (game: GameCard) => {
    if (!connected) {
      alert("Please connect your wallet first to play with real GOR!");
      return;
    }

    if (balance < game.minBet) {
      alert(
        `Insufficient GOR balance! You need ${
          game.minBet
        } GOR but only have ${balance.toFixed(
          4
        )} GOR. Please fund your wallet with Gorbagana GOR tokens.`
      );
      return;
    }

    router.push(`${game.route}?bet=1&real=true`);
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading real wallet games...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-green-900">
      {/* Header */}
      <div className="p-6 bg-black/50">
        <div className="flex justify-between items-center max-w-6xl mx-auto">
          <div>
            <h1 className="text-4xl font-bold text-white">
              🔗 Real Wallet Gaming
            </h1>
            <div className="text-sm text-green-400 font-bold flex items-center gap-2 mt-1">
              <span>🔗</span>
              <span>BLOCKCHAIN POWERED - Real GOR Cryptocurrency</span>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            {connected && publicKey ? (
              <div className="text-white text-right">
                <div className="text-sm text-gray-300">
                  {publicKey.toBase58().slice(0, 8)}...
                  {publicKey.toBase58().slice(-4)}
                </div>
                <div className="text-lg font-bold text-green-400 flex items-center gap-2">
                  💰{" "}
                  {balanceLoading ? "Loading..." : `${balance.toFixed(4)} GOR`}
                  <button
                    onClick={fetchRealBalance}
                    className="text-xs bg-green-500 hover:bg-green-400 px-2 py-1 rounded"
                    disabled={balanceLoading}
                  >
                    🔄
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-white text-right">
                <div className="text-sm text-red-400">Wallet Not Connected</div>
                <div className="text-lg font-bold text-red-400">
                  ⚠️ Connect Required
                </div>
              </div>
            )}
            <button
              onClick={() => router.push("/demo")}
              className="bg-orange-500 text-white px-3 py-2 rounded-lg font-bold hover:bg-orange-400 transition-colors text-sm"
            >
              🎭 Switch to Demo
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

      {/* Real Wallet Connection Status */}
      <div className="max-w-6xl mx-auto p-6">
        {!connected ? (
          <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-6 mb-6">
            <div className="flex items-center gap-4">
              <span className="text-4xl">🔗</span>
              <div>
                <h3 className="text-red-400 font-bold text-xl mb-2">
                  Wallet Connection Required
                </h3>
                <p className="text-red-200 text-sm mb-4">
                  Connect your Phantom, Backpack, or other Solana wallet to play
                  with real GOR tokens on Gorbagana network.
                </p>
                <WalletButton />
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-green-500/20 border border-green-500/50 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-3">
              <span className="text-2xl">✅</span>
              <div>
                <h3 className="text-green-400 font-bold text-lg">
                  Wallet Connected - Ready to Play!
                </h3>
                <p className="text-green-200 text-sm">
                  Address: {publicKey?.toBase58()} | Balance:{" "}
                  {balance.toFixed(4)} GOR | Network: Gorbagana
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Real Wallet Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-black/40 backdrop-blur-lg rounded-xl p-6 border border-white/20">
            <div className="text-center">
              <div className="text-3xl mb-3">💰</div>
              <h3 className="text-xl font-bold text-white mb-2">
                Real Cryptocurrency
              </h3>
              <p className="text-gray-300 text-sm">
                Play with actual GOR tokens on Gorbagana blockchain. Real money,
                real rewards!
              </p>
            </div>
          </div>

          <div className="bg-black/40 backdrop-blur-lg rounded-xl p-6 border border-white/20">
            <div className="text-center">
              <div className="text-3xl mb-3">🔐</div>
              <h3 className="text-xl font-bold text-white mb-2">
                Smart Contract Escrow
              </h3>
              <p className="text-gray-300 text-sm">
                Your funds are secured in blockchain escrow until game
                completion. Fully transparent!
              </p>
            </div>
          </div>

          <div className="bg-black/40 backdrop-blur-lg rounded-xl p-6 border border-white/20">
            <div className="text-center">
              <div className="text-3xl mb-3">⚡</div>
              <h3 className="text-xl font-bold text-white mb-2">
                Instant Payouts
              </h3>
              <p className="text-gray-300 text-sm">
                Winners receive prizes directly to their wallet automatically
                via smart contracts!
              </p>
            </div>
          </div>
        </div>

        {/* Balance and Stats Dashboard */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-black/30 backdrop-blur-md rounded-xl p-4 border border-white/10">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-400">
                {balance.toFixed(3)}
              </div>
              <div className="text-sm text-gray-300">GOR Balance</div>
            </div>
          </div>

          <div className="bg-black/30 backdrop-blur-md rounded-xl p-4 border border-white/10">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-400">
                {connected ? "Connected" : "Disconnected"}
              </div>
              <div className="text-sm text-gray-300">Wallet Status</div>
            </div>
          </div>

          <div className="bg-black/30 backdrop-blur-md rounded-xl p-4 border border-white/10">
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-400">
                Gorbagana
              </div>
              <div className="text-sm text-gray-300">Network</div>
            </div>
          </div>

          <div className="bg-black/30 backdrop-blur-md rounded-xl p-4 border border-white/10">
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-400">Live</div>
              <div className="text-sm text-gray-300">Blockchain Status</div>
            </div>
          </div>
        </div>

        {/* Real Wallet Games Grid */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-white mb-6 text-center">
            🎮 Real GOR Games
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {realWalletGames.map((game) => (
              <div
                key={game.id}
                className={`bg-black/40 backdrop-blur-lg rounded-2xl p-6 border transition-all duration-300 cursor-pointer ${
                  connected && balance >= game.minBet
                    ? "border-white/20 hover:border-green-400/50 hover:bg-black/60"
                    : "border-red-400/30 opacity-75"
                }`}
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
                    REAL
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
                      {game.minBet}-{game.maxBet} GOR
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Game Time:</span>
                    <span className="text-white font-medium">
                      {game.estimatedTime}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Platform Fee:</span>
                    <span className="text-white font-medium">10%</span>
                  </div>
                </div>

                {/* Action Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleGameSelect(game);
                  }}
                  disabled={!connected || balance < game.minBet}
                  className={`w-full py-3 px-4 rounded-lg font-bold transition-colors ${
                    !connected
                      ? "bg-red-600 text-white cursor-not-allowed"
                      : balance < game.minBet
                      ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                      : "bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-400 hover:to-blue-400 text-white"
                  }`}
                >
                  {!connected
                    ? "🔗 Connect Wallet Required"
                    : balance < game.minBet
                    ? "Insufficient GOR Balance"
                    : `🎮 Play with Real GOR (1 GOR)`}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Blockchain Gaming Information */}
        <div className="bg-black/30 backdrop-blur-md rounded-xl p-6 border border-white/10">
          <h3 className="text-xl font-bold text-white mb-4 text-center">
            🔗 How Real Wallet Gaming Works
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <span className="text-blue-400 text-xl">1️⃣</span>
                <div>
                  <div className="text-white font-semibold">
                    Connect Your Wallet
                  </div>
                  <div className="text-gray-300 text-sm">
                    Connect Phantom, Backpack, or any Solana wallet with GOR
                    tokens
                  </div>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <span className="text-green-400 text-xl">2️⃣</span>
                <div>
                  <div className="text-white font-semibold">Pay Entry Fee</div>
                  <div className="text-gray-300 text-sm">
                    Your GOR tokens are held in secure blockchain escrow during
                    gameplay
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <span className="text-yellow-400 text-xl">3️⃣</span>
                <div>
                  <div className="text-white font-semibold">Play & Compete</div>
                  <div className="text-gray-300 text-sm">
                    Compete with other players for real cryptocurrency prizes
                  </div>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <span className="text-purple-400 text-xl">4️⃣</span>
                <div>
                  <div className="text-white font-semibold">Win Real GOR</div>
                  <div className="text-gray-300 text-sm">
                    Winners receive prizes automatically via smart contract to
                    their wallet!
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
