"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

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

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleEnterGame = () => {
    if (connected) {
      router.push("/games");
    }
  };

  // Prevent hydration issues by not rendering until mounted
  if (!mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-blue-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-blue-900 flex flex-col items-center justify-center p-4">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-4 -left-4 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
        <div className="absolute -top-4 -right-4 w-72 h-72 bg-yellow-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 text-center max-w-4xl mx-auto">
        {/* Logo/Title */}
        <div className="mb-12">
          <h1 className="text-6xl md:text-8xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-pink-500 to-blue-500 mb-6 animate-pulse">
            TOKEN TAKEDOWN
          </h1>
          <h2 className="text-3xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 mb-4">
            ROYALE
          </h2>
          <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            The ultimate 60-second blockchain battle royale. Collect tokens,
            freeze opponents, and claim your share of the gGOR prize pool!
          </p>
        </div>

        {/* Game Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-black/20 backdrop-blur-lg rounded-xl p-6 border border-white/10">
            <div className="text-4xl mb-4">⚡</div>
            <h3 className="text-xl font-bold text-yellow-400 mb-2">
              Fast-Paced Action
            </h3>
            <p className="text-gray-300 text-sm">
              60-second battles with up to 6 players competing for the ultimate
              prize pool
            </p>
          </div>

          <div className="bg-black/20 backdrop-blur-lg rounded-xl p-6 border border-white/10">
            <div className="text-4xl mb-4">🔗</div>
            <h3 className="text-xl font-bold text-blue-400 mb-2">
              Blockchain Powered
            </h3>
            <p className="text-gray-300 text-sm">
              Real gGOR tokens, smart contract escrow, and automated prize
              distribution
            </p>
          </div>

          <div className="bg-black/20 backdrop-blur-lg rounded-xl p-6 border border-white/10">
            <div className="text-4xl mb-4">💰</div>
            <h3 className="text-xl font-bold text-green-400 mb-2">
              Win Real Rewards
            </h3>
            <p className="text-gray-300 text-sm">
              Top 3 players split the prize pool: 50%, 30%, and 20%
            </p>
          </div>
        </div>

        {/* Game Access Options */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Real Wallet Connection */}
          <div className="bg-black/30 backdrop-blur-lg rounded-2xl p-8 border border-white/20">
            {!connected ? (
              <div>
                <h3 className="text-2xl font-bold text-white mb-4">
                  Connect Your Wallet
                </h3>
                <p className="text-gray-400 mb-6">
                  Connect your Backpack wallet to start playing on Gorbagana
                  testnet with real GOR tokens
                </p>
                <WalletButton />
                <div className="mt-4 text-center">
                  <div className="flex items-center justify-center gap-2 text-green-400 font-semibold text-sm">
                    <span>✅</span>
                    <span>Real GOR tokens</span>
                  </div>
                  <div className="flex items-center justify-center gap-2 text-green-400 font-semibold text-sm">
                    <span>✅</span>
                    <span>Actual blockchain rewards</span>
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <h3 className="text-2xl font-bold text-green-400 mb-4">
                  🎉 Wallet Connected!
                </h3>
                <p className="text-gray-300 mb-2">
                  Address: {publicKey?.toBase58().slice(0, 8)}...
                  {publicKey?.toBase58().slice(-8)}
                </p>
                <p className="text-gray-400 mb-6">
                  Ready to enter the arena and compete for real gGOR tokens!
                </p>

                <button
                  onClick={handleEnterGame}
                  className="w-full bg-gradient-to-r from-yellow-500 to-pink-600 hover:from-yellow-400 hover:to-pink-500 text-white font-bold py-4 px-8 rounded-xl text-xl transition-all duration-300 hover:scale-105 hover:shadow-2xl"
                >
                  🎮 ENTER THE ARENA
                </button>
              </div>
            )}
          </div>

          {/* Mock Wallet / Demo Mode */}
          <div className="bg-black/30 backdrop-blur-lg rounded-2xl p-8 border border-orange-400/30">
            <div>
              <h3 className="text-2xl font-bold text-orange-400 mb-4">
                🎭 Play Without Wallet
              </h3>
              <p className="text-gray-400 mb-6">
                Try the games with virtual GOR tokens. Perfect if you don't have
                testnet tokens yet or want to practice first!
              </p>

              <button
                onClick={() => router.push("/mock-games")}
                className="w-full bg-gradient-to-r from-orange-500 to-purple-600 hover:from-orange-400 hover:to-purple-500 text-white font-bold py-4 px-8 rounded-xl text-xl transition-all duration-300 hover:scale-105 hover:shadow-2xl mb-4"
              >
                🎮 START DEMO MODE
              </button>

              <div className="text-center space-y-1">
                <div className="flex items-center justify-center gap-2 text-orange-400 font-semibold text-sm">
                  <span>🎁</span>
                  <span>Free 10 GOR to start</span>
                </div>
                <div className="flex items-center justify-center gap-2 text-orange-400 font-semibold text-sm">
                  <span>💾</span>
                  <span>Progress saved locally</span>
                </div>
                <div className="flex items-center justify-center gap-2 text-orange-400 font-semibold text-sm">
                  <span>🎮</span>
                  <span>Full game experience</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Game Info */}
        <div className="text-center text-gray-400">
          <div className="flex flex-wrap justify-center gap-8 text-sm">
            <div>⏱️ 60-second rounds</div>
            <div>💰 5 gGOR entry fee</div>
            <div>❄️ Freeze power-ups</div>
            <div>🏆 Real prizes</div>
            <div>🔗 Gorbagana testnet</div>
          </div>
        </div>
      </div>

      {/* Custom Animations */}
      <style jsx>{`
        @keyframes blob {
          0% {
            transform: translate(0px, 0px) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
          100% {
            transform: translate(0px, 0px) scale(1);
          }
        }

        .animate-blob {
          animation: blob 7s infinite;
        }

        .animation-delay-2000 {
          animation-delay: 2s;
        }

        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  );
}
