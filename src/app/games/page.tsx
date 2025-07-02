"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import dynamic from "next/dynamic";
import { gsap } from "gsap";
import Footer from "../components/Footer";

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

  // Animation refs
  const headerRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);
  const walletRef = useRef<HTMLDivElement>(null);
  const buttonsRef = useRef<HTMLDivElement>(null);

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // GSAP animations on mount
  useEffect(() => {
    if (mounted && headerRef.current) {
      const tl = gsap.timeline();

      // Header entrance animation
      tl.fromTo(
        headerRef.current,
        { opacity: 0, y: -50 },
        { opacity: 1, y: 0, duration: 0.8, ease: "power2.out" }
      );

      // Title glitch effect
      if (titleRef.current) {
        tl.fromTo(
          titleRef.current,
          { opacity: 0, x: -100, textShadow: "0 0 0 transparent" },
          {
            opacity: 1,
            x: 0,
            textShadow: "0 0 20px #00ffff, 0 0 40px #ff00ff, 0 0 60px #ffff00",
            duration: 1,
            ease: "power2.out",
          },
          "-=0.5"
        );
      }

      // Stats animation
      if (statsRef.current) {
        tl.fromTo(
          statsRef.current,
          { opacity: 0, scale: 0.8 },
          { opacity: 1, scale: 1, duration: 0.6, ease: "back.out(1.7)" },
          "-=0.3"
        );
      }

      // Wallet info animation
      if (walletRef.current) {
        tl.fromTo(
          walletRef.current,
          { opacity: 0, x: -50 },
          { opacity: 1, x: 0, duration: 0.5, ease: "power2.out" },
          "-=0.4"
        );
      }

      // Buttons animation
      if (buttonsRef.current) {
        tl.fromTo(
          buttonsRef.current,
          { opacity: 0, x: 50 },
          { opacity: 1, x: 0, duration: 0.5, ease: "power2.out" },
          "-=0.3"
        );
      }

      // Continuous title glow animation
      gsap.to(titleRef.current, {
        textShadow: "0 0 30px #00ffff, 0 0 60px #ff00ff, 0 0 90px #ffff00",
        duration: 2,
        repeat: -1,
        yoyo: true,
        ease: "power2.inOut",
      });
    }
  }, [mounted]);

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
    {
      id: "pokemonCards",
      name: "Pokemon Card Battle",
      description:
        "Collect and battle with Pokemon cards using real GOR cryptocurrency! Trade card packs and win prizes.",
      icon: "🎴",
      minBet: 1,
      maxBet: 2,
      players: "2-6 Players",
      estimatedTime: "10-15 min",
      route: "/pokemon-cards",
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
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-cyan-400 text-xl animate-pulse">
          Loading gaming arena...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* Animated Background Grid */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-purple-500/10 to-yellow-500/10"></div>
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `
              linear-gradient(rgba(0,255,255,0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(0,255,255,0.1) 1px, transparent 1px)
            `,
            backgroundSize: "50px 50px",
            animation: "gridMove 20s linear infinite",
          }}
        ></div>
      </div>

      {/* Floating Orbs */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-20 left-10 w-4 h-4 bg-cyan-400 rounded-full animate-bounce opacity-60"></div>
        <div className="absolute top-40 right-20 w-3 h-3 bg-purple-400 rounded-full animate-pulse opacity-40"></div>
        <div className="absolute bottom-40 left-1/4 w-5 h-5 bg-yellow-400 rounded-full animate-ping opacity-50"></div>
        <div className="absolute top-1/3 right-10 w-2 h-2 bg-green-400 rounded-full animate-bounce opacity-70"></div>
      </div>

      {/* Modern Cyberpunk Header */}
      <div
        ref={headerRef}
        className="relative z-10 p-6 bg-gradient-to-r from-black/90 via-purple-900/30 to-black/90 backdrop-blur-xl border-b border-cyan-400/20"
      >
        <div className="max-w-7xl mx-auto">
          {/* Main Title Section */}
          <div className="text-center mb-8">
            <h1
              ref={titleRef}
              className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-400 to-yellow-400 mb-4 tracking-wider"
              style={{
                fontFamily: "monospace",
                textShadow: "0 0 20px #00ffff, 0 0 40px #ff00ff",
              }}
            >
              ⚡ GORBAGANA ARENA ⚡
            </h1>
            <div className="flex items-center justify-center gap-3 text-lg font-bold">
              <span className="bg-gradient-to-r from-green-400 to-blue-400 text-black px-4 py-2 rounded-full animate-pulse">
                🔗 BLOCKCHAIN POWERED
              </span>
              <span className="bg-gradient-to-r from-yellow-400 to-red-400 text-black px-4 py-2 rounded-full animate-pulse">
                💰 REAL GOR CRYPTO
              </span>
              <span className="bg-gradient-to-r from-purple-400 to-pink-400 text-black px-4 py-2 rounded-full animate-pulse">
                🎮 LIVE BATTLES
              </span>
            </div>
          </div>

          {/* Stats & Info Grid */}
          <div
            ref={statsRef}
            className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
          >
            <div className="bg-black/60 backdrop-blur-lg rounded-xl p-4 border border-cyan-400/30 hover:border-cyan-400/60 transition-all duration-300 hover:scale-105">
              <div className="text-center">
                <div className="text-3xl font-black text-cyan-400 mb-1">
                  {balance.toFixed(3)}
                </div>
                <div className="text-cyan-300 text-sm font-bold">
                  💎 GOR BALANCE
                </div>
              </div>
            </div>

            <div className="bg-black/60 backdrop-blur-lg rounded-xl p-4 border border-purple-400/30 hover:border-purple-400/60 transition-all duration-300 hover:scale-105">
              <div className="text-center">
                <div className="text-3xl font-black text-purple-400 mb-1">
                  {connected ? "ONLINE" : "OFFLINE"}
                </div>
                <div className="text-purple-300 text-sm font-bold">
                  🔌 WALLET STATUS
                </div>
              </div>
            </div>

            <div className="bg-black/60 backdrop-blur-lg rounded-xl p-4 border border-yellow-400/30 hover:border-yellow-400/60 transition-all duration-300 hover:scale-105">
              <div className="text-center">
                <div className="text-3xl font-black text-yellow-400 mb-1">
                  LIVE
                </div>
                <div className="text-yellow-300 text-sm font-bold">
                  ⚡ NETWORK
                </div>
              </div>
            </div>

            <div className="bg-black/60 backdrop-blur-lg rounded-xl p-4 border border-green-400/30 hover:border-green-400/60 transition-all duration-300 hover:scale-105">
              <div className="text-center">
                <div className="text-3xl font-black text-green-400 mb-1">4</div>
                <div className="text-green-300 text-sm font-bold">🎯 GAMES</div>
              </div>
            </div>
          </div>

          {/* Wallet & Navigation Section */}
          <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
            {/* Wallet Connection Status */}
            <div ref={walletRef} className="flex items-center gap-4">
              {connected && publicKey ? (
                <div className="bg-gradient-to-r from-green-500/20 to-blue-500/20 backdrop-blur-lg rounded-xl p-4 border border-green-400/40 hover:border-green-400/70 transition-all duration-300">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-green-400 rounded-full flex items-center justify-center animate-pulse">
                      <span className="text-2xl">🟢</span>
                    </div>
                    <div>
                      <div className="text-green-400 font-black text-lg">
                        WALLET CONNECTED
                      </div>
                      <div className="text-green-300 text-sm font-mono">
                        {publicKey.toBase58().slice(0, 8)}...
                        {publicKey.toBase58().slice(-6)}
                      </div>
                      <div className="text-white font-bold flex items-center gap-2">
                        💰{" "}
                        {balanceLoading
                          ? "LOADING..."
                          : `${balance.toFixed(4)} GOR`}
                        <button
                          onClick={fetchRealBalance}
                          className="text-xs bg-cyan-500 hover:bg-cyan-400 px-3 py-1 rounded-full transition-all duration-300 hover:scale-110"
                          disabled={balanceLoading}
                        >
                          🔄 REFRESH
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-gradient-to-r from-red-500/20 to-orange-500/20 backdrop-blur-lg rounded-xl p-4 border border-red-400/40 hover:border-red-400/70 transition-all duration-300">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-red-400 rounded-full flex items-center justify-center animate-pulse">
                      <span className="text-2xl">🔴</span>
                    </div>
                    <div>
                      <div className="text-red-400 font-black text-lg">
                        WALLET DISCONNECTED
                      </div>
                      <div className="text-red-300 text-sm">
                        Connect to enter the arena
                      </div>
                      <div className="mt-2">
                        <WalletButton />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div ref={buttonsRef} className="flex gap-4">
              <button
                onClick={() => router.push("/demo")}
                className="group bg-gradient-to-r from-orange-500 to-red-500 text-white px-8 py-4 rounded-xl font-black text-lg border border-orange-400/50 hover:border-orange-400 transition-all duration-300 hover:scale-110 hover:shadow-lg hover:shadow-orange-500/50"
              >
                <span className="flex items-center gap-2">
                  🎭 DEMO MODE
                  <span className="group-hover:rotate-12 transition-transform duration-300">
                    ⚡
                  </span>
                </span>
              </button>

              <button
                onClick={() => router.push("/leaderboard")}
                className="group bg-gradient-to-r from-yellow-500 to-amber-500 text-black px-8 py-4 rounded-xl font-black text-lg border border-yellow-400/50 hover:border-yellow-400 transition-all duration-300 hover:scale-110 hover:shadow-lg hover:shadow-yellow-500/50"
              >
                <span className="flex items-center gap-2">
                  🏆 LEADERBOARD
                  <span className="group-hover:bounce transition-transform duration-300">
                    👑
                  </span>
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes gridMove {
          0% {
            transform: translate(0, 0);
          }
          100% {
            transform: translate(50px, 50px);
          }
        }

        @keyframes glitch {
          0% {
            text-shadow: 0.05em 0 0 #00ffff, -0.05em -0.025em 0 #ff00ff,
              0.025em 0.05em 0 #ffff00;
          }
          15% {
            text-shadow: 0.05em 0 0 #00ffff, -0.05em -0.025em 0 #ff00ff,
              0.025em 0.05em 0 #ffff00;
          }
          16% {
            text-shadow: -0.05em -0.025em 0 #00ffff, 0.025em 0.025em 0 #ff00ff,
              -0.05em -0.05em 0 #ffff00;
          }
          49% {
            text-shadow: -0.05em -0.025em 0 #00ffff, 0.025em 0.025em 0 #ff00ff,
              -0.05em -0.05em 0 #ffff00;
          }
          50% {
            text-shadow: 0.025em 0.05em 0 #00ffff, 0.05em 0 0 #ff00ff,
              0 -0.05em 0 #ffff00;
          }
          99% {
            text-shadow: 0.025em 0.05em 0 #00ffff, 0.05em 0 0 #ff00ff,
              0 -0.05em 0 #ffff00;
          }
          100% {
            text-shadow: -0.025em 0 0 #00ffff, -0.025em -0.025em 0 #ff00ff,
              -0.025em -0.05em 0 #ffff00;
          }
        }
      `}</style>

      {/* Real Wallet Connection Status */}
      <div className="max-w-6xl mx-auto p-4 md:p-6">
        {!connected ? (
          <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-4 md:p-6 mb-6">
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <span className="text-3xl md:text-4xl">🔗</span>
              <div className="text-center sm:text-left">
                <h3 className="text-red-400 font-bold text-lg md:text-xl mb-2">
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
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-3">
              <span className="text-xl md:text-2xl">✅</span>
              <div className="text-center sm:text-left">
                <h3 className="text-green-400 font-bold text-base md:text-lg">
                  Wallet Connected - Ready to Play!
                </h3>
                <p className="text-green-200 text-xs md:text-sm break-all">
                  <span className="block sm:inline">
                    Address: {publicKey?.toBase58()}
                  </span>
                  {" | "}
                  <span className="block sm:inline">
                    Balance: {balance.toFixed(4)} GOR
                  </span>
                  {" | "}
                  <span className="block sm:inline">Network: Gorbagana</span>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Real Wallet Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-6 md:mb-8">
          <div className="bg-black/40 backdrop-blur-lg rounded-xl p-4 md:p-6 border border-white/20">
            <div className="text-center">
              <div className="text-2xl md:text-3xl mb-2 md:mb-3">💰</div>
              <h3 className="text-lg md:text-xl font-bold text-white mb-2">
                Real Cryptocurrency
              </h3>
              <p className="text-gray-300 text-xs md:text-sm">
                Play with actual GOR tokens on Gorbagana blockchain. Real money,
                real rewards!
              </p>
            </div>
          </div>

          <div className="bg-black/40 backdrop-blur-lg rounded-xl p-4 md:p-6 border border-white/20">
            <div className="text-center">
              <div className="text-2xl md:text-3xl mb-2 md:mb-3">🔐</div>
              <h3 className="text-lg md:text-xl font-bold text-white mb-2">
                Smart Contract Escrow
              </h3>
              <p className="text-gray-300 text-xs md:text-sm">
                Your funds are secured in blockchain escrow until game
                completion. Fully transparent!
              </p>
            </div>
          </div>

          <div className="bg-black/40 backdrop-blur-lg rounded-xl p-4 md:p-6 border border-white/20">
            <div className="text-center">
              <div className="text-2xl md:text-3xl mb-2 md:mb-3">⚡</div>
              <h3 className="text-lg md:text-xl font-bold text-white mb-2">
                Instant Payouts
              </h3>
              <p className="text-gray-300 text-xs md:text-sm">
                Winners receive prizes directly to their wallet automatically
                via smart contracts!
              </p>
            </div>
          </div>
        </div>

        {/* Balance and Stats Dashboard */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-8">
          <div className="bg-black/30 backdrop-blur-md rounded-xl p-3 md:p-4 border border-white/10">
            <div className="text-center">
              <div className="text-lg md:text-2xl font-bold text-green-400">
                {balance.toFixed(3)}
              </div>
              <div className="text-xs md:text-sm text-gray-300">
                GOR Balance
              </div>
            </div>
          </div>

          <div className="bg-black/30 backdrop-blur-md rounded-xl p-3 md:p-4 border border-white/10">
            <div className="text-center">
              <div className="text-lg md:text-2xl font-bold text-blue-400">
                {connected ? "Connected" : "Disconnected"}
              </div>
              <div className="text-xs md:text-sm text-gray-300">
                Wallet Status
              </div>
            </div>
          </div>

          <div className="bg-black/30 backdrop-blur-md rounded-xl p-3 md:p-4 border border-white/10">
            <div className="text-center">
              <div className="text-lg md:text-2xl font-bold text-purple-400">
                Gorbagana
              </div>
              <div className="text-xs md:text-sm text-gray-300">Network</div>
            </div>
          </div>

          <div className="bg-black/30 backdrop-blur-md rounded-xl p-3 md:p-4 border border-white/10">
            <div className="text-center">
              <div className="text-lg md:text-2xl font-bold text-yellow-400">
                Live
              </div>
              <div className="text-xs md:text-sm text-gray-300">
                Blockchain Status
              </div>
            </div>
          </div>
        </div>

        {/* Real Wallet Games Grid */}
        <div className="mb-6 md:mb-8">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-4 md:mb-6 text-center">
            🎮 Real GOR Games
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {realWalletGames.map((game) => (
              <div
                key={game.id}
                className={`bg-black/40 backdrop-blur-lg rounded-2xl p-4 md:p-6 border transition-all duration-300 cursor-pointer ${
                  connected && balance >= game.minBet
                    ? "border-white/20 hover:border-green-400/50 hover:bg-black/60"
                    : "border-red-400/30 opacity-75"
                }`}
                onClick={() => handleGameSelect(game)}
              >
                {/* Game Header */}
                <div className="flex items-center justify-between mb-3 md:mb-4">
                  <div className="flex items-center space-x-2 md:space-x-3">
                    <span className="text-3xl md:text-4xl">{game.icon}</span>
                    <div>
                      <h3 className="text-lg md:text-xl font-bold text-white">
                        {game.name}
                      </h3>
                      <p className="text-gray-400 text-xs md:text-sm">
                        {game.players}
                      </p>
                    </div>
                  </div>
                  <div className="bg-green-500 text-white px-2 md:px-3 py-1 rounded-full text-xs font-bold">
                    REAL
                  </div>
                </div>

                {/* Game Description */}
                <p className="text-gray-300 text-xs md:text-sm mb-3 md:mb-4 leading-relaxed">
                  {game.description}
                </p>

                {/* Game Info */}
                <div className="space-y-1.5 md:space-y-2 mb-3 md:mb-4">
                  <div className="flex justify-between text-xs md:text-sm">
                    <span className="text-gray-400">Bet Range:</span>
                    <span className="text-white font-medium">
                      {game.minBet}-{game.maxBet} GOR
                    </span>
                  </div>
                  <div className="flex justify-between text-xs md:text-sm">
                    <span className="text-gray-400">Game Time:</span>
                    <span className="text-white font-medium">
                      {game.estimatedTime}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs md:text-sm">
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
                  className={`w-full py-2.5 md:py-3 px-4 rounded-lg font-bold transition-colors text-sm md:text-base ${
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
        <div className="bg-black/30 backdrop-blur-md rounded-xl p-4 md:p-6 border border-white/10">
          <h3 className="text-lg md:text-xl font-bold text-white mb-4 text-center">
            🔗 How Real Wallet Gaming Works
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <span className="text-blue-400 text-lg md:text-xl">1️⃣</span>
                <div>
                  <div className="text-white font-semibold text-sm md:text-base">
                    Connect Your Wallet
                  </div>
                  <div className="text-gray-300 text-xs md:text-sm">
                    Connect Phantom, Backpack, or any Solana wallet with GOR
                    tokens
                  </div>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <span className="text-green-400 text-lg md:text-xl">2️⃣</span>
                <div>
                  <div className="text-white font-semibold text-sm md:text-base">
                    Pay Entry Fee
                  </div>
                  <div className="text-gray-300 text-xs md:text-sm">
                    Your GOR tokens are held in secure blockchain escrow during
                    gameplay
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <span className="text-yellow-400 text-lg md:text-xl">3️⃣</span>
                <div>
                  <div className="text-white font-semibold text-sm md:text-base">
                    Play & Compete
                  </div>
                  <div className="text-gray-300 text-xs md:text-sm">
                    Compete with other players for real cryptocurrency prizes
                  </div>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <span className="text-purple-400 text-lg md:text-xl">4️⃣</span>
                <div>
                  <div className="text-white font-semibold text-sm md:text-base">
                    Win Real GOR
                  </div>
                  <div className="text-gray-300 text-xs md:text-sm">
                    Winners receive prizes automatically via smart contract to
                    their wallet!
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer with attribution */}
      <Footer />
    </div>
  );
}
