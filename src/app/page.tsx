"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import dynamic from "next/dynamic";
import { gsap } from "gsap";
import {
  BoltIcon,
  LinkIcon,
  CurrencyDollarIcon,
  PlayIcon,
  RocketLaunchIcon,
  UsersIcon,
  TrophyIcon,
  ClockIcon,
  GlobeAltIcon,
  SparklesIcon,
  ShieldCheckIcon,
  CpuChipIcon,
} from "@heroicons/react/24/outline";
import Footer from "./components/Footer";

// Dynamically import wallet components to prevent hydration errors
const WalletButton = dynamic(() => import("./components/WalletButton"), {
  ssr: false,
  loading: () => (
    <button
      className="bg-gradient-to-r from-purple-600 to-blue-500 rounded-xl px-6 py-3 font-bold text-white cursor-not-allowed opacity-50"
      disabled
    >
      Loading Wallet...
    </button>
  ),
});

export default function Home() {
  const { connected, publicKey } = useWallet();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [currentStats, setCurrentStats] = useState({
    players: 0,
    prizes: 0,
    games: 0,
  });

  // GSAP refs
  const titleRef = useRef(null);
  const subtitleRef = useRef(null);
  const descriptionRef = useRef(null);
  const statsRef = useRef(null);
  const featuresRef = useRef(null);
  const cardsRef = useRef(null);

  useEffect(() => {
    setMounted(true);

    // Animated counter effect
    const animateCounters = () => {
      const targetStats = { players: 1337, prizes: 42069, games: 9001 };
      const duration = 2000;
      const steps = 60;
      const increment = duration / steps;

      let step = 0;
      const timer = setInterval(() => {
        step++;
        const progress = step / steps;

        setCurrentStats({
          players: Math.floor(targetStats.players * progress),
          prizes: Math.floor(targetStats.prizes * progress),
          games: Math.floor(targetStats.games * progress),
        });

        if (step >= steps) {
          clearInterval(timer);
          setCurrentStats(targetStats);
        }
      }, increment);
    };

    // GSAP Animations
    const tl = gsap.timeline();

    // Hero animations
    tl.fromTo(
      titleRef.current,
      { opacity: 0, y: 50 },
      { opacity: 1, y: 0, duration: 1, ease: "power3.out" }
    )
      .fromTo(
        subtitleRef.current,
        { opacity: 0, y: 30 },
        { opacity: 1, y: 0, duration: 0.8, ease: "power3.out" },
        "-=0.5"
      )
      .fromTo(
        descriptionRef.current,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.6, ease: "power3.out" },
        "-=0.3"
      )
      .fromTo(
        statsRef.current,
        { opacity: 0, scale: 0.8 },
        { opacity: 1, scale: 1, duration: 0.8, ease: "back.out(1.7)" },
        "-=0.2"
      )
      .fromTo(
        featuresRef.current,
        { opacity: 0, y: 40 },
        { opacity: 1, y: 0, duration: 0.8, ease: "power3.out", stagger: 0.1 },
        "-=0.4"
      )
      .fromTo(
        cardsRef.current,
        { opacity: 0, y: 30 },
        { opacity: 1, y: 0, duration: 0.6, ease: "power3.out" },
        "-=0.2"
      );

    // Start counter animation after initial animations
    setTimeout(animateCounters, 1000);
  }, []);

  const handleEnterGame = () => {
    if (connected) {
      router.push("/games");
    }
  };

  // Prevent hydration issues by not rendering until mounted
  if (!mounted) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-purple-400 font-semibold text-lg animate-pulse">
            Initializing Platform...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 relative overflow-hidden">
      {/* Professional Background Pattern */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-950 via-purple-950/20 to-gray-900"></div>
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: `radial-gradient(circle at 25% 25%, #8b5cf6 0%, transparent 50%),
                             radial-gradient(circle at 75% 75%, #a855f7 0%, transparent 50%)`,
          }}
        ></div>
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `
              linear-gradient(rgba(139, 92, 246, 0.05) 1px, transparent 1px),
              linear-gradient(90deg, rgba(139, 92, 246, 0.05) 1px, transparent 1px)
            `,
            backgroundSize: "60px 60px",
          }}
        ></div>
      </div>

      {/* Floating Particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 rounded-full bg-purple-400/30"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animation: `float ${3 + Math.random() * 4}s ease-in-out infinite`,
              animationDelay: `${Math.random() * 2}s`,
            }}
          ></div>
        ))}
      </div>

      {/* Main Content */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center p-6">
        {/* Hero Section */}
        <div className="text-center mb-20 max-w-6xl mx-auto">
          {/* Professional Title */}
          <div ref={titleRef} className="mb-8">
            <h1 className="text-6xl md:text-8xl font-bold text-white mb-6 tracking-tight">
              <span className="bg-gradient-to-r from-white via-purple-200 to-purple-400 bg-clip-text text-transparent">
                GORBAGANA
              </span>
            </h1>
          </div>

          <div ref={subtitleRef} className="mb-8">
            <h2 className="text-3xl md:text-5xl font-semibold text-purple-300 mb-4 tracking-wide">
              Blockchain Gaming Platform
            </h2>
            <div className="w-24 h-1 bg-gradient-to-r from-purple-500 to-purple-300 mx-auto rounded-full"></div>
          </div>

          {/* Professional Description */}
          <div ref={descriptionRef} className="mb-16">
            <p className="text-xl md:text-2xl text-gray-300 max-w-4xl mx-auto leading-relaxed font-light">
              Enter the next generation of competitive gaming where blockchain
              technology meets skill-based competition. Earn real cryptocurrency
              rewards in our secure, transparent gaming ecosystem.
            </p>
          </div>

          {/* Live Stats */}
          <div
            ref={statsRef}
            className="grid grid-cols-3 gap-4 mb-16 max-w-3xl mx-auto"
          >
            <div className="text-center group">
              <div className="bg-gray-900/50 backdrop-blur-xl rounded-xl p-4 border border-purple-500/20 hover:border-purple-400/40 transition-all duration-300 hover:scale-105">
                <UsersIcon className="w-8 h-8 text-purple-400 mx-auto mb-2" />
                <div className="text-3xl font-bold text-white mb-1 tabular-nums">
                  {currentStats.players.toLocaleString()}
                </div>
                <div className="text-purple-300 font-semibold tracking-wide text-sm">
                  ACTIVE PLAYERS
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  Ready for Competition
                </div>
              </div>
            </div>

            <div className="text-center group">
              <div className="bg-gray-900/50 backdrop-blur-xl rounded-xl p-4 border border-purple-500/20 hover:border-purple-400/40 transition-all duration-300 hover:scale-105">
                <CurrencyDollarIcon className="w-8 h-8 text-purple-400 mx-auto mb-2" />
                <div className="text-3xl font-bold text-white mb-1 tabular-nums">
                  {currentStats.prizes.toLocaleString()}
                </div>
                <div className="text-purple-300 font-semibold tracking-wide text-sm">
                  GOR DISTRIBUTED
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  Real Cryptocurrency
                </div>
              </div>
            </div>

            <div className="text-center group">
              <div className="bg-gray-900/50 backdrop-blur-xl rounded-xl p-4 border border-purple-500/20 hover:border-purple-400/40 transition-all duration-300 hover:scale-105">
                <TrophyIcon className="w-8 h-8 text-purple-400 mx-auto mb-2" />
                <div className="text-3xl font-bold text-white mb-1 tabular-nums">
                  {currentStats.games.toLocaleString()}
                </div>
                <div className="text-purple-300 font-semibold tracking-wide text-sm">
                  GAMES COMPLETED
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  Competitive Matches
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Professional Features */}
        <div
          ref={featuresRef}
          className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-20 max-w-7xl mx-auto"
        >
          <div className="group relative">
            <div className="bg-gray-900/50 backdrop-blur-xl rounded-2xl p-8 border border-purple-500/20 hover:border-purple-400/40 transition-all duration-300 hover:scale-105">
              <BoltIcon className="w-16 h-16 text-purple-400 mb-6" />
              <h3 className="text-2xl font-bold text-white mb-4">
                Lightning Speed
              </h3>
              <p className="text-gray-300 mb-4">
                Sub-second transaction confirmations with optimized blockchain
                infrastructure
              </p>
              <div className="w-full bg-gray-800 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-purple-500 to-purple-300 h-2 rounded-full"
                  style={{ width: "95%" }}
                ></div>
              </div>
            </div>
          </div>

          <div className="group relative">
            <div className="bg-gray-900/50 backdrop-blur-xl rounded-2xl p-8 border border-purple-500/20 hover:border-purple-400/40 transition-all duration-300 hover:scale-105">
              <ShieldCheckIcon className="w-16 h-16 text-purple-400 mb-6" />
              <h3 className="text-2xl font-bold text-white mb-4">
                Secure Infrastructure
              </h3>
              <p className="text-gray-300 mb-4">
                Military-grade encryption with decentralized smart contract
                verification
              </p>
              <div className="w-full bg-gray-800 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-purple-500 to-purple-300 h-2 rounded-full"
                  style={{ width: "100%" }}
                ></div>
              </div>
            </div>
          </div>

          <div className="group relative">
            <div className="bg-gray-900/50 backdrop-blur-xl rounded-2xl p-8 border border-purple-500/20 hover:border-purple-400/40 transition-all duration-300 hover:scale-105">
              <CpuChipIcon className="w-16 h-16 text-purple-400 mb-6" />
              <h3 className="text-2xl font-bold text-white mb-4">
                Smart Contracts
              </h3>
              <p className="text-gray-300 mb-4">
                Automated prize distribution with transparent, auditable code
              </p>
              <div className="w-full bg-gray-800 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-purple-500 to-purple-300 h-2 rounded-full"
                  style={{ width: "98%" }}
                ></div>
              </div>
            </div>
          </div>

          <div className="group relative">
            <div className="bg-gray-900/50 backdrop-blur-xl rounded-2xl p-8 border border-purple-500/20 hover:border-purple-400/40 transition-all duration-300 hover:scale-105">
              <SparklesIcon className="w-16 h-16 text-purple-400 mb-6" />
              <h3 className="text-2xl font-bold text-white mb-4">
                Multi-Game Suite
              </h3>
              <p className="text-gray-300 mb-4">
                Diverse portfolio of skill-based competitive gaming experiences
              </p>
              <div className="w-full bg-gray-800 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-purple-500 to-purple-300 h-2 rounded-full"
                  style={{ width: "92%" }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* Professional Action Cards */}
        <div
          ref={cardsRef}
          className="grid grid-cols-1 lg:grid-cols-2 gap-10 mb-16 max-w-6xl mx-auto"
        >
          {/* Wallet Connection */}
          <div className="group relative">
            <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-purple-400 rounded-3xl blur opacity-20 group-hover:opacity-40 transition duration-500"></div>
            <div className="relative bg-gray-900/80 backdrop-blur-xl rounded-3xl p-10 border border-purple-500/30">
              {!connected ? (
                <div className="text-center">
                  <RocketLaunchIcon className="w-16 h-16 text-purple-400 mx-auto mb-6" />
                  <h3 className="text-3xl font-bold text-white mb-6">
                    Connect Wallet
                  </h3>
                  <p className="text-gray-300 mb-8 text-lg leading-relaxed">
                    Access the Gorbagana ecosystem with your preferred Web3
                    wallet. Start earning real GOR tokens through competitive
                    gameplay.
                  </p>
                  <div className="mb-8">
                    <WalletButton />
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center gap-4 text-purple-300 font-medium">
                      <ShieldCheckIcon className="w-6 h-6" />
                      <span>Secure Wallet Integration</span>
                    </div>
                    <div className="flex items-center gap-4 text-purple-300 font-medium">
                      <BoltIcon className="w-6 h-6" />
                      <span>Instant Blockchain Settlements</span>
                    </div>
                    <div className="flex items-center gap-4 text-purple-300 font-medium">
                      <TrophyIcon className="w-6 h-6" />
                      <span>Competitive Leaderboards</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center">
                  <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                    <ShieldCheckIcon className="w-10 h-10 text-green-400" />
                  </div>
                  <h3 className="text-3xl font-bold text-green-400 mb-6">
                    Wallet Connected
                  </h3>
                  <div className="bg-gray-800/50 rounded-xl p-4 mb-6 border border-green-400/30">
                    <p className="text-gray-300 font-mono text-sm">
                      {publicKey?.toBase58().slice(0, 16)}...
                      {publicKey?.toBase58().slice(-16)}
                    </p>
                  </div>
                  <p className="text-gray-300 mb-8 text-lg">
                    Platform access granted. Begin your competitive gaming
                    journey and start earning rewards.
                  </p>

                  <button
                    onClick={handleEnterGame}
                    className="group relative w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white font-bold py-4 px-8 rounded-2xl text-xl transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-green-500/25"
                  >
                    <span className="relative z-10 flex items-center justify-center gap-3">
                      <PlayIcon className="w-6 h-6" />
                      Enter Gaming Platform
                    </span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Practice Mode */}
          <div className="group relative">
            <div className="absolute -inset-1 bg-gradient-to-r from-orange-500 to-pink-500 rounded-3xl blur opacity-20 group-hover:opacity-40 transition duration-500"></div>
            <div className="relative bg-gray-900/80 backdrop-blur-xl rounded-3xl p-10 border border-orange-500/30">
              <div className="text-center">
                <SparklesIcon className="w-16 h-16 text-orange-400 mx-auto mb-6" />
                <h3 className="text-3xl font-bold text-orange-400 mb-6">
                  Practice Environment
                </h3>
                <p className="text-gray-300 mb-8 text-lg leading-relaxed">
                  Master the platform mechanics with virtual tokens. Perfect
                  your strategies before entering live competitions.
                </p>

                <button
                  onClick={() => router.push("/demo")}
                  className="group relative w-full bg-gradient-to-r from-orange-500 to-pink-600 hover:from-orange-400 hover:to-pink-500 text-white font-bold py-4 px-8 rounded-2xl text-xl transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-orange-500/25 mb-6"
                >
                  <span className="relative z-10 flex items-center justify-center gap-3">
                    <PlayIcon className="w-6 h-6" />
                    Launch Practice Mode
                  </span>
                </button>

                <div className="space-y-4">
                  <div className="flex items-center gap-4 text-orange-300 font-medium">
                    <CurrencyDollarIcon className="w-6 h-6" />
                    <span>Virtual Currency Included</span>
                  </div>
                  <div className="flex items-center gap-4 text-orange-300 font-medium">
                    <ClockIcon className="w-6 h-6" />
                    <span>Unlimited Practice Time</span>
                  </div>
                  <div className="flex items-center gap-4 text-orange-300 font-medium">
                    <SparklesIcon className="w-6 h-6" />
                    <span>Full Feature Access</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Platform Information */}
        <div className="text-center mb-8">
          <div className="inline-flex flex-wrap items-center justify-center gap-8 bg-gray-900/30 backdrop-blur-xl rounded-2xl px-8 py-6 border border-purple-500/20">
            <div className="flex items-center gap-3 text-purple-300 font-medium">
              <ClockIcon className="w-5 h-5" />
              <span>60-Second Rounds</span>
            </div>
            <div className="flex items-center gap-3 text-purple-300 font-medium">
              <CurrencyDollarIcon className="w-5 h-5" />
              <span>1-2 GOR Entry</span>
            </div>
            <div className="flex items-center gap-3 text-purple-300 font-medium">
              <TrophyIcon className="w-5 h-5" />
              <span>Real Cryptocurrency Prizes</span>
            </div>
            <div className="flex items-center gap-3 text-purple-300 font-medium">
              <GlobeAltIcon className="w-5 h-5" />
              <span>Gorbagana Network</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-gray-500 text-sm">
          <p>
            Powered by advanced blockchain technology for the next generation of
            competitive gaming
          </p>
        </div>
      </div>

      {/* Custom Animations */}
      <style jsx>{`
        @keyframes float {
          0%,
          100% {
            transform: translateY(0px) translateX(0px);
            opacity: 0.3;
          }
          50% {
            transform: translateY(-20px) translateX(10px);
            opacity: 0.8;
          }
        }
      `}</style>
    </div>
  );
}
