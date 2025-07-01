"use client";

import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useWallet } from "@solana/wallet-adapter-react";
import { useEffect, useState } from "react";

export default function WalletButton() {
  const [mounted, setMounted] = useState(false);
  const [showWalletPrompt, setShowWalletPrompt] = useState(false);
  const { wallets, wallet, connected } = useWallet();

  // Ensure component only renders on client side to prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  const handleWalletError = () => {
    setShowWalletPrompt(true);
  };

  const closeWalletPrompt = () => {
    setShowWalletPrompt(false);
  };

  // Show loading state during hydration
  if (!mounted) {
    return (
      <button
        className="bg-gradient-to-r from-purple-600 to-blue-500 rounded-xl px-6 py-3 font-bold text-white cursor-not-allowed opacity-50"
        disabled
      >
        Loading Wallet...
      </button>
    );
  }

  return (
    <>
      <div className="wallet-adapter-dropdown">
        <WalletMultiButton className="!bg-gradient-to-r !from-purple-600 !to-blue-500 !rounded-xl !px-6 !py-3 !font-bold !text-white hover:!scale-105 !transition-transform !duration-200" />

        {/* Wallet Info */}
        {mounted && (
          <div className="mt-2 text-center text-sm text-gray-400">
            {connected ? (
              <span className="text-green-400">✅ Wallet Connected</span>
            ) : (
              <div className="flex items-center justify-center gap-2">
                <span>
                  {wallets.length} wallet{wallets.length !== 1 ? "s" : ""}{" "}
                  available
                </span>
                <button
                  onClick={() => setShowWalletPrompt(true)}
                  className="text-blue-400 hover:text-blue-300 underline text-xs"
                  title="Need help installing a wallet?"
                >
                  Need help?
                </button>
              </div>
            )}
          </div>
        )}

        <style jsx global>{`
          .wallet-adapter-button:not([disabled]):hover {
            transform: scale(1.03);
            transition: transform 0.2s ease;
          }

          .wallet-adapter-button-trigger {
            background: linear-gradient(to right, #9333ea, #3b82f6) !important;
            border-radius: 0.75rem !important;
            padding: 0.75rem 1.5rem !important;
            font-weight: bold !important;
            color: white !important;
          }

          .wallet-adapter-dropdown {
            position: relative;
            display: inline-block;
          }

          .wallet-adapter-dropdown-list {
            background: rgba(0, 0, 0, 0.9) !important;
            border: 1px solid rgba(255, 255, 255, 0.1) !important;
            border-radius: 0.75rem !important;
            backdrop-filter: blur(10px) !important;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1),
              0 10px 10px -5px rgba(0, 0, 0, 0.04) !important;
          }

          .wallet-adapter-dropdown-list-item {
            color: white !important;
            padding: 0.75rem 1rem !important;
            border-radius: 0.5rem !important;
            margin: 0.25rem !important;
          }

          .wallet-adapter-dropdown-list-item:hover {
            background: rgba(255, 255, 255, 0.1) !important;
          }
        `}</style>
      </div>

      {/* Wallet Installation Prompt */}
      {showWalletPrompt && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-xl p-6 max-w-md w-full border border-gray-700">
            <h3 className="text-xl font-bold text-white mb-4">
              🦊 Need a Wallet?
            </h3>
            <p className="text-gray-300 mb-6">
              To play Token Takedown Royale, you need a Solana wallet. We
              recommend:
            </p>

            <div className="space-y-3 mb-6">
              <a
                href="https://backpack.app/"
                target="_blank"
                rel="noopener noreferrer"
                className="block p-3 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
              >
                <div className="flex items-center">
                  <span className="text-lg mr-3">🎒</span>
                  <div>
                    <div className="font-semibold text-white">Backpack</div>
                    <div className="text-sm text-purple-200">
                      Best for Gorbagana
                    </div>
                  </div>
                </div>
              </a>

              <a
                href="https://phantom.app/"
                target="_blank"
                rel="noopener noreferrer"
                className="block p-3 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
              >
                <div className="flex items-center">
                  <span className="text-lg mr-3">👻</span>
                  <div>
                    <div className="font-semibold text-white">Phantom</div>
                    <div className="text-sm text-blue-200">Popular choice</div>
                  </div>
                </div>
              </a>

              <a
                href="https://solflare.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="block p-3 bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
              >
                <div className="flex items-center">
                  <span className="text-lg mr-3">🔥</span>
                  <div>
                    <div className="font-semibold text-white">Solflare</div>
                    <div className="text-sm text-green-200">Feature-rich</div>
                  </div>
                </div>
              </a>
            </div>

            <div className="flex gap-3">
              <button
                onClick={closeWalletPrompt}
                className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => window.location.reload()}
                className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-white transition-colors"
              >
                Refresh Page
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
